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
        if (users.length > 0) {
            await pool.query('INSERT INTO activity_logs (id, actorId, action, timestamp, details) VALUES (?, ?, ?, ?, ?)', 
                [`log_${Date.now()}`, users[0].id, 'Login', new Date(), 'Login successful.']);
            return res.json({ user: users[0] });
        }

        const [students] = await pool.query('SELECT * FROM students WHERE email = ? OR cpf = ?', [email, email]);
        if (students.length > 0 && (students[0].password === password || !students[0].password)) {
             const student = students[0];
             const userObj = { id: `user_${student.id}`, name: student.name, email: student.email, role: 'student', academyId: student.academyId, studentId: student.id, birthDate: student.birthDate };
            return res.json({ user: userObj });
        }

        res.status(401).json({ message: 'User or password invalid' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/register', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { name, address, responsible, responsibleRegistration, email, password } = req.body;
        const academyId = `academy_${Date.now()}`;
        const userId = `user_${Date.now()}`;

        await conn.query('INSERT INTO academies (id, name, address, responsible, responsibleRegistration, email, password) VALUES (?, ?, ?, ?, ?, ?, ?)', [academyId, name, address, responsible, responsibleRegistration, email, password]);
        await conn.query('INSERT INTO users (id, name, email, role, academyId) VALUES (?, ?, ?, ?, ?)', [userId, responsible, email, 'academy_admin', academyId]);

        await conn.commit();
        res.json({ success: true });
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
        const [students] = await pool.query('SELECT * FROM students');
        const parsedStudents = students.map(s => ({ ...s, isCompetitor: Boolean(s.isCompetitor), medals: s.medals ? JSON.parse(s.medals) : { gold: 0, silver: 0, bronze: 0 } }));
        const [payments] = await pool.query('SELECT * FROM payment_history');
        parsedStudents.forEach(s => { s.paymentHistory = payments.filter(p => p.studentId === s.id); });

        const [users] = await pool.query('SELECT * FROM users');
        const [academies] = await pool.query('SELECT * FROM academies');
        const [graduations] = await pool.query('SELECT * FROM graduations');
        const [professors] = await pool.query('SELECT * FROM professors');
        const [schedules] = await pool.query('SELECT * FROM class_schedules');
        const [assistants] = await pool.query('SELECT * FROM schedule_assistants');
        const parsedSchedules = schedules.map(s => ({ ...s, assistantIds: assistants.filter(a => a.scheduleId === s.id).map(a => a.assistantId) }));

        const [attendance] = await pool.query('SELECT * FROM attendance_records');
        const [logs] = await pool.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100');
        const [settings] = await pool.query('SELECT * FROM theme_settings LIMIT 1');
        
        let parsedSettings = settings[0] || {};
        parsedSettings = { ...parsedSettings, useGradient: Boolean(parsedSettings.useGradient), publicPageEnabled: Boolean(parsedSettings.publicPageEnabled), socialLoginEnabled: Boolean(parsedSettings.socialLoginEnabled) };

        res.json({ students: parsedStudents, users, academies, graduations, professors, schedules: parsedSchedules, attendanceRecords: attendance, activityLogs: logs, themeSettings: parsedSettings });
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
        // --- Data Sanitization ---
        if (data.medals && typeof data.medals === 'object') {
            data.medals = JSON.stringify(data.medals);
        }
        for (const key of ['birthDate', 'firstGraduationDate', 'lastPromotionDate']) {
            if (data[key] && typeof data[key] === 'string') {
                data[key] = data[key].split('T')[0];
            } else if (data[key] === '' || data[key] === undefined) {
                data[key] = null;
            }
        }
        if (data.hasOwnProperty('isCompetitor')) {
            data.isCompetitor = data.isCompetitor ? 1 : 0;
        }

        if (data.id) { // UPDATE logic
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

        } else { // INSERT logic
            const id = `student_${Date.now()}`;
            const studentData = { 
                paymentStatus: 'unpaid', 
                stripes: 0,
                isCompetitor: 0,
                medals: '{}',
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
        if (!data.id) data.id = `prof_${Date.now()}`;
        if (data.blackBeltDate && typeof data.blackBeltDate === 'string') {
            data.blackBeltDate = data.blackBeltDate.split('T')[0];
        } else if (data.blackBeltDate === '' || data.blackBeltDate === undefined) {
            data.blackBeltDate = null;
        }
        
        const keys = Object.keys(data).map(key => `\`${key}\``);
        const values = Object.values(data);
        await pool.query(`REPLACE INTO professors (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, values);
        res.json({ success: true });
    } catch (error) {
        console.error(`Error in professors:`, error);
        res.status(500).json({ message: error.message });
    }
});
app.delete('/api/professors/:id', deleteHandler('professors'));

app.post('/api/schedules', async (req, res) => {
    const { assistantIds, ...schedule } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const id = schedule.id || `schedule_${Date.now()}`;
        await conn.query(`REPLACE INTO class_schedules (id, className, dayOfWeek, startTime, endTime, professorId, academyId, requiredGraduationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, schedule.className, schedule.dayOfWeek, schedule.startTime, schedule.endTime, schedule.professorId, schedule.academyId, schedule.requiredGraduationId]);
        
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
    try {
        await pool.query(`UPDATE theme_settings SET systemName=?, logoUrl=?, primaryColor=?, secondaryColor=?, backgroundColor=?, cardBackgroundColor=?, buttonColor=?, buttonTextColor=?, iconColor=?, chartColor1=?, chartColor2=?, useGradient=?, reminderDaysBeforeDue=?, overdueDaysAfterDue=?, theme=?, monthlyFeeAmount=?, publicPageEnabled=?, heroHtml=?, aboutHtml=?, branchesHtml=?, footerHtml=?, customCss=?, customJs=?, socialLoginEnabled=?, googleClientId=?, facebookAppId=?, pixKey=?, pixHolderName=?, copyrightText=?, systemVersion=? WHERE id = 1`,
            [s.systemName, s.logoUrl, s.primaryColor, s.secondaryColor, s.backgroundColor, s.cardBackgroundColor, s.buttonColor, s.buttonTextColor, s.iconColor, s.chartColor1, s.chartColor2, s.useGradient, s.reminderDaysBeforeDue, s.overdueDaysAfterDue, s.theme, s.monthlyFeeAmount, s.publicPageEnabled, s.heroHtml, s.aboutHtml, s.branchesHtml, s.footerHtml, s.customCss, s.customJs, s.socialLoginEnabled, s.googleClientId, s.facebookAppId, s.pixKey, s.pixHolderName, s.copyrightText, s.systemVersion]
        );
        res.json({ success: true });
    } catch(e) { console.error(e); res.status(500).send(e.message); }
});

app.post('/api/attendance', createHandler('attendance_records'));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});