import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());

// FIX: Increase payload limit to 50mb to handle Base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'paulocarecateam',
    password: process.env.DB_PASS || 'E6uoXi34ZwwAINCD5T25',
    database: process.env.DB_NAME || 'paulocarecateam',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- API Routes ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        // Helper function to check academy status
        const checkAcademyStatus = async (academyId) => {
            if (!academyId) return true; 
            
            const [rows] = await pool.query('SELECT status FROM academies WHERE id = ?', [academyId]);
            if (rows.length > 0) {
                const status = rows[0].status;
                if (status === 'pending') {
                    throw new Error('Sua academia está em análise. Aguarde a aprovação do administrador.');
                }
                if (status === 'rejected') {
                    throw new Error('O cadastro da sua academia foi recusado. Entre em contato com a suporte.');
                }
                if (status === 'blocked') {
                    throw new Error('Acesso temporariamente suspenso. Entre em contato com a administração do sistema.');
                }
            }
            return true;
        };

        if (users.length > 0) {
            const user = users[0];
            
            if (user.role !== 'general_admin') {
                await checkAcademyStatus(user.academyId);
            }

            await pool.query('INSERT INTO activity_logs (id, actorId, action, timestamp, details) VALUES (?, ?, ?, ?, ?)', 
                [`log_${Date.now()}`, users[0].id, 'Login', new Date(), 'Login successful.']);
            
            if (users[0].studentId) {
                 try {
                     await pool.query('UPDATE students SET lastSeen = NOW() WHERE id = ?', [users[0].studentId]);
                 } catch (e) { console.error("Could not update lastSeen", e); }
            }

            return res.json({ user: users[0] });
        }

        const [students] = await pool.query('SELECT * FROM students WHERE email = ? OR cpf = ?', [email, email]);
        if (students.length > 0 && (students[0].password === password || !students[0].password)) {
             const student = students[0];
             
             if (student.status === 'blocked') {
                 return res.status(403).json({ message: 'Seu acesso foi temporariamente bloqueado. Contate a administração.' });
             }

             await checkAcademyStatus(student.academyId);

             const userObj = { id: `user_${student.id}`, name: student.name, email: student.email, role: 'student', academyId: student.academyId, studentId: student.id, birthDate: student.birthDate };
             
             try {
                await pool.query('UPDATE students SET lastSeen = NOW() WHERE id = ?', [student.id]);
             } catch (e) { console.error("Could not update lastSeen", e); }

            return res.json({ user: userObj });
        }
        
        const [academies] = await pool.query('SELECT * FROM academies WHERE email = ? AND password = ?', [email, password]);
        if (academies.length > 0) {
             const academy = academies[0];
             
             if (academy.status === 'pending') {
                 return res.status(403).json({ message: 'Sua academia está em análise. Aguarde a aprovação.' });
             }
             if (academy.status === 'rejected') {
                 return res.status(403).json({ message: 'O cadastro da sua academia foi recusado.' });
             }
             if (academy.status === 'blocked') {
                 return res.status(403).json({ message: 'Acesso temporariamente suspenso. Contate o administrador.' });
             }

             const [adminUser] = await pool.query('SELECT * FROM users WHERE academyId = ? AND role = "academy_admin"', [academy.id]);
             
             if (adminUser.length > 0) {
                 return res.json({ user: adminUser[0] });
             }
        }

        res.status(401).json({ message: 'User or password invalid' });
    } catch (error) {
        console.error(error);
        const status = error.message.includes('em análise') || error.message.includes('recusado') || error.message.includes('suspenso') || error.message.includes('bloqueado') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error' });
    }
});

app.post('/api/register', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { name, address, responsible, responsibleRegistration, email, password } = req.body;
        const academyId = `academy_${Date.now()}`;
        const userId = `user_${Date.now()}`;
        
        await conn.query(
            'INSERT INTO academies (id, name, address, responsible, responsibleRegistration, email, password, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [academyId, name, address, responsible, responsibleRegistration, email, password, 'pending']
        );
        
        await conn.query('INSERT INTO users (id, name, email, role, academyId) VALUES (?, ?, ?, ?, ?)', [userId, responsible, email, 'academy_admin', academyId]);

        await conn.commit();
        res.json({ success: true, message: 'Cadastro realizado! Aguarde a aprovação do administrador.' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ message: 'Error registering academy' });
    } finally {
        conn.release();
    }
});

app.get('/api/initial-data', async (req, res) => {
    try {
        // --- Migration Helper: Add missing columns if they don't exist ---
        
        try {
            await pool.query("SELECT isInstructor FROM students LIMIT 1");
        } catch (e) {
            console.log("Migrating: Adding isInstructor to students");
            await pool.query("ALTER TABLE students ADD COLUMN isInstructor BOOLEAN DEFAULT FALSE");
        }

        try {
            await pool.query("SELECT lastSeen FROM students LIMIT 1");
        } catch (e) {
            console.log("Migrating: Adding lastSeen to students");
            await pool.query("ALTER TABLE students ADD COLUMN lastSeen DATETIME");
        }

        try {
             await pool.query("SELECT isInstructor FROM professors LIMIT 1");
        } catch (e) {
             console.log("Migrating: Adding isInstructor to professors");
             await pool.query("ALTER TABLE professors ADD COLUMN isInstructor BOOLEAN DEFAULT FALSE");
        }
        
        try {
             await pool.query("SELECT birthDate FROM professors LIMIT 1");
        } catch (e) {
             console.log("Migrating: Adding birthDate to professors");
             await pool.query("ALTER TABLE professors ADD COLUMN birthDate DATE");
        }
        
        try {
             await pool.query("SELECT imageUrl FROM users LIMIT 1");
        } catch (e) {
             console.log("Migrating: Adding imageUrl to users");
             await pool.query("ALTER TABLE users ADD COLUMN imageUrl LONGTEXT");
        }

        try {
             await pool.query("SELECT studentProfileEditEnabled FROM theme_settings LIMIT 1");
        } catch (e) {
             console.log("Migrating: Adding studentProfileEditEnabled to theme_settings");
             await pool.query("ALTER TABLE theme_settings ADD COLUMN studentProfileEditEnabled BOOLEAN DEFAULT FALSE");
        }

        try {
             await pool.query("SELECT settings FROM academies LIMIT 1");
        } catch (e) {
             console.log("Migrating: Adding settings to academies");
             await pool.query("ALTER TABLE academies ADD COLUMN settings LONGTEXT");
        }

        try {
             await pool.query("SELECT status FROM academies LIMIT 1");
        } catch (e) {
             console.log("Migrating: Adding status to academies");
             await pool.query("ALTER TABLE academies ADD COLUMN status VARCHAR(50) DEFAULT 'pending'");
             await pool.query("UPDATE academies SET status = 'active' WHERE status IS NULL OR status = 'pending'");
        }
        
        try {
             await pool.query("SELECT observations FROM class_schedules LIMIT 1");
        } catch (e) {
             console.log("Migrating: Adding observations to class_schedules");
             await pool.query("ALTER TABLE class_schedules ADD COLUMN observations TEXT");
        }

        try {
            await pool.query("SELECT status FROM students LIMIT 1");
        } catch (e) {
            console.log("Migrating: Adding status to students");
            await pool.query("ALTER TABLE students ADD COLUMN status VARCHAR(50) DEFAULT 'active'");
        }

        try {
            await pool.query("SELECT status FROM professors LIMIT 1");
        } catch (e) {
            console.log("Migrating: Adding status to professors");
            await pool.query("ALTER TABLE professors ADD COLUMN status VARCHAR(50) DEFAULT 'active'");
        }

        try {
             await pool.query("SELECT mercadoPagoAccessToken FROM theme_settings LIMIT 1");
        } catch (e) {
             console.log("Migrating: Adding Payment Gateway columns to theme_settings");
             await pool.query("ALTER TABLE theme_settings ADD COLUMN mercadoPagoAccessToken TEXT");
             await pool.query("ALTER TABLE theme_settings ADD COLUMN mercadoPagoPublicKey TEXT");
             await pool.query("ALTER TABLE theme_settings ADD COLUMN efiClientId TEXT");
             await pool.query("ALTER TABLE theme_settings ADD COLUMN efiClientSecret TEXT");
        }

        try {
             await pool.query("SELECT color2 FROM graduations LIMIT 1");
        } catch (e) {
             console.log("Migrating: Adding color2 and color3 to graduations");
             await pool.query("ALTER TABLE graduations ADD COLUMN color2 VARCHAR(255)");
             await pool.query("ALTER TABLE graduations ADD COLUMN color3 VARCHAR(255)");
        }

        try {
             await pool.query("SELECT gradientAngle FROM graduations LIMIT 1");
        } catch (e) {
             console.log("Migrating: Adding gradientAngle and gradientHardness to graduations");
             await pool.query("ALTER TABLE graduations ADD COLUMN gradientAngle INTEGER DEFAULT 90");
             await pool.query("ALTER TABLE graduations ADD COLUMN gradientHardness INTEGER DEFAULT 0");
        }


        const [students] = await pool.query('SELECT * FROM students');
        const parsedStudents = students.map(s => ({ 
            ...s, 
            isCompetitor: Boolean(s.isCompetitor),
            isInstructor: Boolean(s.isInstructor),
            medals: s.medals ? JSON.parse(s.medals) : { gold: 0, silver: 0, bronze: 0 },
            status: s.status || 'active'
        }));
        const [payments] = await pool.query('SELECT * FROM payment_history');
        parsedStudents.forEach(s => { s.paymentHistory = payments.filter(p => p.studentId === s.id); });

        const [users] = await pool.query('SELECT * FROM users');
        const [academies] = await pool.query('SELECT * FROM academies');
        const parsedAcademies = academies.map(a => ({
            ...a,
            settings: a.settings ? JSON.parse(a.settings) : {},
            status: a.status || 'active'
        }));

        const [graduations] = await pool.query('SELECT * FROM graduations');
        
        const [professors] = await pool.query('SELECT * FROM professors');
        const parsedProfessors = professors.map(p => ({
            ...p,
            isInstructor: Boolean(p.isInstructor),
            status: p.status || 'active'
        }));

        const [schedules] = await pool.query('SELECT * FROM class_schedules');
        const [assistants] = await pool.query('SELECT * FROM schedule_assistants');
        const parsedSchedules = schedules.map(s => ({ ...s, assistantIds: assistants.filter(a => a.scheduleId === s.id).map(a => a.assistantId) }));

        const [attendance] = await pool.query('SELECT * FROM attendance_records');
        const [logs] = await pool.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100');
        const [settings] = await pool.query('SELECT * FROM theme_settings LIMIT 1');
        
        let parsedSettings = settings[0] || {};
        parsedSettings = { 
            ...parsedSettings, 
            useGradient: Boolean(parsedSettings.useGradient), 
            publicPageEnabled: Boolean(parsedSettings.publicPageEnabled), 
            registrationEnabled: Boolean(parsedSettings.registrationEnabled), 
            socialLoginEnabled: Boolean(parsedSettings.socialLoginEnabled),
            studentProfileEditEnabled: Boolean(parsedSettings.studentProfileEditEnabled)
        };

        res.json({ students: parsedStudents, users, academies: parsedAcademies, graduations, professors: parsedProfessors, schedules: parsedSchedules, attendanceRecords: attendance, activityLogs: logs, themeSettings: parsedSettings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching data' });
    }
});

const createHandler = (table) => async (req, res) => {
    try {
        const data = req.body;
        const keys = Object.keys(data).map(key => `\`${key}\``);
        const values = Object.values(data).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
        await pool.query(`REPLACE INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, values);
        res.json({ success: true });
    } catch (error) {
        console.error(`Error in ${table}:`, error);
        res.status(500).json({ message: error.message });
    }
};

const deleteHandler = (table) => async (req, res) => {
    try {
        await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

app.post('/api/students', async (req, res) => {
    const data = req.body;
    try {
        if (data.medals && typeof data.medals === 'object') {
            data.medals = JSON.stringify(data.medals);
        }
        for (const key of ['birthDate', 'firstGraduationDate', 'lastPromotionDate', 'lastSeen']) {
            if (data[key] && typeof data[key] === 'string' && key !== 'lastSeen') {
                data[key] = data[key].split('T')[0];
            } else if (data[key] === '' || data[key] === undefined) {
                data[key] = null;
            }
        }
        if (data.hasOwnProperty('isCompetitor')) {
            data.isCompetitor = data.isCompetitor ? 1 : 0;
        }
        if (data.hasOwnProperty('isInstructor')) {
            data.isInstructor = data.isInstructor ? 1 : 0;
        }

        if (data.id) {
            const { id, ...updateData } = data;
            if (updateData.password === '' || updateData.password === undefined) {
                delete updateData.password;
            }
            const updateKeys = Object.keys(updateData);
            
            if (updateKeys.length === 0) {
                return res.json({ success: true, id, message: "No fields to update." });
            }

            const updateFields = updateKeys.map(key => `\`${key}\` = ?`).join(', ');
            const updateValues = Object.values(updateData);

            await pool.query(`UPDATE students SET ${updateFields} WHERE id = ?`, [...updateValues, id]);
            res.json({ success: true, id });

        } else {
            const id = `student_${Date.now()}`;
            const studentData = { 
                paymentStatus: 'unpaid', 
                stripes: 0,
                isCompetitor: 0,
                isInstructor: 0,
                medals: '{}',
                status: 'active',
                ...data,
                id, 
            };
            const keys = Object.keys(studentData).map(key => `\`${key}\``).join(',');
            const placeholders = Object.keys(studentData).map(() => '?').join(',');
            const values = Object.values(studentData);
            
            await pool.query(`INSERT INTO students (${keys}) VALUES (${placeholders})`, values);
            res.json({ success: true, id });
        }
    } catch(e) { 
        console.error("Error saving student:", e.message); 
        res.status(500).json({ message: e.message }); 
    }
});
app.delete('/api/students/:id', deleteHandler('students'));
app.post('/api/students/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE students SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/api/students/promote-instructor', async (req, res) => {
    const { studentId } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [students] = await conn.query('SELECT * FROM students WHERE id = ?', [studentId]);
        if (students.length === 0) throw new Error("Student not found");
        const student = students[0];

        await conn.query('UPDATE students SET isInstructor = 1 WHERE id = ?', [studentId]);

        const professorId = `prof_inst_${student.id}`;
        const [existingProf] = await conn.query('SELECT id FROM professors WHERE cpf = ?', [student.cpf]); 
        
        if (existingProf.length === 0) {
             await conn.query(`
                INSERT INTO professors (id, name, fjjpe_registration, cpf, academyId, graduationId, imageUrl, isInstructor, birthDate, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'active')
            `, [professorId, student.name, student.fjjpe_registration, student.cpf, student.academyId, student.beltId, student.imageUrl, student.birthDate]);
        } else {
             await conn.query('UPDATE professors SET isInstructor = 1, graduationId = ?, academyId = ? WHERE id = ?', 
                [student.beltId, student.academyId, existingProf[0].id]);
        }

        await conn.commit();
        res.json({ success: true });
    } catch (error) {
        await conn.rollback();
        console.error("Error promoting student:", error);
        res.status(500).json({ message: error.message });
    } finally {
        conn.release();
    }
});

app.post('/api/students/demote-instructor', async (req, res) => {
    const { professorId } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [professors] = await conn.query('SELECT cpf, isInstructor FROM professors WHERE id = ?', [professorId]);
        
        if (professors.length > 0) {
            const prof = professors[0];
            
            if (prof.cpf) {
                await conn.query('UPDATE students SET isInstructor = 0 WHERE cpf = ?', [prof.cpf]);
            }
            
            await conn.query('DELETE FROM professors WHERE id = ?', [professorId]);
        }

        await conn.commit();
        res.json({ success: true });
    } catch (error) {
        await conn.rollback();
        console.error("Error demoting instructor:", error);
        res.status(500).json({ message: error.message.includes('foreign key constraint') ? 'Não é possível remover este instrutor pois ele possui turmas ou histórico vinculado.' : error.message });
    } finally {
        conn.release();
    }
});

app.post('/api/students/payment', async (req, res) => {
    const { studentId, status, amount } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('UPDATE students SET paymentStatus = ? WHERE id = ?', [status, studentId]);
        if (status === 'paid') {
            await conn.query('INSERT INTO payment_history (id, studentId, date, amount) VALUES (?, ?, ?, ?)', [`pay_${Date.now()}`, studentId, new Date(), amount]);
        }
        await conn.commit();
        res.json({ success: true });
    } catch (error) {
        await conn.rollback();
        res.status(500).send(error.message);
    } finally {
        conn.release();
    }
});

app.post('/api/professors', async (req, res) => {
    try {
        const data = req.body;
        
        if (data.blackBeltDate && typeof data.blackBeltDate === 'string') {
            data.blackBeltDate = data.blackBeltDate.split('T')[0];
        } else if (data.blackBeltDate === '' || data.blackBeltDate === undefined) {
            data.blackBeltDate = null;
        }

        if (data.birthDate && typeof data.birthDate === 'string') {
            data.birthDate = data.birthDate.split('T')[0];
        } else if (data.birthDate === '' || data.birthDate === undefined) {
            data.birthDate = null;
        }

        if (data.hasOwnProperty('isInstructor')) {
            data.isInstructor = data.isInstructor ? 1 : 0;
        } else {
            data.isInstructor = 0;
        }
        
        if (data.id) {
            const { id, ...updateData } = data;
            const updateFields = Object.keys(updateData).map(key => `\`${key}\` = ?`).join(', ');
            const updateValues = Object.values(updateData);
            await pool.query(`UPDATE professors SET ${updateFields} WHERE id = ?`, [...updateValues, id]);
        } else {
            data.id = `prof_${Date.now()}`;
            if (!data.status) data.status = 'active';
            const keys = Object.keys(data).map(key => `\`${key}\``).join(',');
            const placeholders = Object.keys(data).map(() => '?').join(',');
            const values = Object.values(data);
            await pool.query(`INSERT INTO professors (${keys}) VALUES (${placeholders})`, values);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error(`Error in professors:`, error);
        res.status(500).json({ message: error.message });
    }
});
app.delete('/api/professors/:id', deleteHandler('professors'));
app.post('/api/professors/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE professors SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/api/schedules', async (req, res) => {
    const { assistantIds, ...schedule } = req.body;
    
    const sanitize = (val) => (val === '' || val === undefined ? null : val);
    schedule.professorId = sanitize(schedule.professorId);
    schedule.academyId = sanitize(schedule.academyId);
    schedule.requiredGraduationId = sanitize(schedule.requiredGraduationId);
    schedule.observations = sanitize(schedule.observations);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const id = schedule.id || `schedule_${Date.now()}`;
        
        await conn.query(`
            INSERT INTO class_schedules (id, className, dayOfWeek, startTime, endTime, professorId, academyId, requiredGraduationId, observations) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            className = VALUES(className),
            dayOfWeek = VALUES(dayOfWeek),
            startTime = VALUES(startTime),
            endTime = VALUES(endTime),
            professorId = VALUES(professorId),
            academyId = VALUES(academyId),
            requiredGraduationId = VALUES(requiredGraduationId),
            observations = VALUES(observations)
        `, [id, schedule.className, schedule.dayOfWeek, schedule.startTime, schedule.endTime, schedule.professorId, schedule.academyId, schedule.requiredGraduationId, schedule.observations]);
        
        await conn.query('DELETE FROM schedule_assistants WHERE scheduleId = ?', [id]);
        if (assistantIds && assistantIds.length > 0) {
            for (const assistId of assistantIds) {
                await conn.query('INSERT INTO schedule_assistants (scheduleId, assistantId) VALUES (?, ?)', [id, assistId]);
            }
        }
        await conn.commit();
        res.json({ success: true });
    } catch (error) {
        await conn.rollback();
        console.error("Error saving schedule:", error);
        res.status(500).send(error.message);
    } finally {
        conn.release();
    }
});
app.delete('/api/schedules/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM schedule_assistants WHERE scheduleId = ?', [req.params.id]);
        await pool.query('DELETE FROM class_schedules WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch(e) { res.status(500).send(e.message); }
});

app.post('/api/graduations', createHandler('graduations'));
app.delete('/api/graduations/:id', deleteHandler('graduations'));
app.post('/api/graduations/reorder', async (req, res) => {
    const items = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        for (const item of items) {
            await conn.query('UPDATE graduations SET `rank` = ? WHERE id = ?', [item.rank, item.id]);
        }
        await conn.commit();
        res.json({ success: true });
    } catch(e) { await conn.rollback(); res.status(500).send(e.message); } finally { conn.release(); }
});

app.post('/api/settings', async (req, res) => {
    const s = req.body;
    const academyId = req.query.academyId;

    try {
        if (academyId) {
            const settingsJson = JSON.stringify(s);
            await pool.query('UPDATE academies SET settings = ? WHERE id = ?', [settingsJson, academyId]);
        } else {
            await pool.query(`UPDATE theme_settings SET 
                systemName=?, logoUrl=?, primaryColor=?, secondaryColor=?, backgroundColor=?, 
                cardBackgroundColor=?, buttonColor=?, buttonTextColor=?, iconColor=?, chartColor1=?, chartColor2=?,
                useGradient=?, reminderDaysBeforeDue=?, overdueDaysAfterDue=?, theme=?, monthlyFeeAmount=?,
                publicPageEnabled=?, registrationEnabled=?, heroHtml=?, aboutHtml=?, branchesHtml=?, footerHtml=?, customCss=?, customJs=?,
                socialLoginEnabled=?, googleClientId=?, facebookAppId=?, pixKey=?, pixHolderName=?, copyrightText=?, systemVersion=?, studentProfileEditEnabled=?,
                mercadoPagoAccessToken=?, mercadoPagoPublicKey=?, efiClientId=?, efiClientSecret=?
                WHERE id = 1`,
                [s.systemName, s.logoUrl, s.primaryColor, s.secondaryColor, s.backgroundColor, 
                 s.cardBackgroundColor, s.buttonColor, s.buttonTextColor, s.iconColor, s.chartColor1, s.chartColor2,
                 s.useGradient, s.reminderDaysBeforeDue, s.overdueDaysAfterDue, s.theme, s.monthlyFeeAmount,
                 s.publicPageEnabled, s.registrationEnabled, s.heroHtml, s.aboutHtml, s.branchesHtml, s.footerHtml, s.customCss, s.customJs,
                 s.socialLoginEnabled, s.googleClientId, s.facebookAppId, s.pixKey, s.pixHolderName, s.copyrightText, s.systemVersion, s.studentProfileEditEnabled,
                 s.mercadoPagoAccessToken, s.mercadoPagoPublicKey, s.efiClientId, s.efiClientSecret]
            );
        }
        res.json({ success: true });
    } catch(e) { console.error(e); res.status(500).send(e.message); }
});

app.post('/api/attendance', createHandler('attendance_records'));
app.post('/api/academies', async (req, res) => {
    const data = req.body;
    if (data.settings && typeof data.settings === 'object') {
        data.settings = JSON.stringify(data.settings);
    }
    
    const keys = Object.keys(data).map(key => `\`${key}\``);
    const values = Object.values(data).map(v => v);
    
    try {
        await pool.query(`REPLACE INTO academies (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, values);
        res.json({ success: true });
    } catch (e) {
         console.error(e);
         res.status(500).json({ message: e.message });
    }
});

app.post('/api/academies/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 
    
    if (!['active', 'rejected', 'blocked'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        await pool.query('UPDATE academies SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating academy status:", error);
        res.status(500).json({ message: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});