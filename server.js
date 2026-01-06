
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
// Performance: Gzip Compression
app.use(compression());

// Increase payload limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '1y', 
    immutable: true,
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
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test DB Connection on Startup
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

// --- Helper: Map Mercado Pago Errors ---
const getFriendlyErrorMessage = (statusDetail) => {
    const errors = {
        'cc_rejected_bad_filled_card_number': 'Revise o número do cartão.',
        'cc_rejected_bad_filled_date': 'Revise a data de vencimento.',
        'cc_rejected_bad_filled_other': 'Revise os dados do cartão.',
        'cc_rejected_bad_filled_security_code': 'Revise o código de segurança.',
        'cc_rejected_blacklist': 'Não pudemos processar seu pagamento.',
        'cc_rejected_call_for_authorize': 'Ligue para o seu banco para autorizar o pagamento.',
        'cc_rejected_card_disabled': 'Ligue para o seu banco para ativar seu cartão.',
        'cc_rejected_card_error': 'Não conseguimos processar seu pagamento.',
        'cc_rejected_duplicated_payment': 'Você já efetuou um pagamento com esse valor.',
        'cc_rejected_high_risk': 'Seu pagamento foi recusado por segurança.',
        'cc_rejected_insufficient_amount': 'O cartão possui saldo insuficiente.',
        'cc_rejected_invalid_installments': 'O cartão não processa pagamentos nesta quantidade de parcelas.',
        'cc_rejected_max_attempts': 'Você atingiu o limite de tentativas permitidas.',
        'cc_rejected_other_reason': 'O cartão não processou o pagamento.'
    };
    return errors[statusDetail] || `Pagamento recusado: ${statusDetail}`;
};

// --- Helper: Serve Image from Buffer ---
app.get('/api/images/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    let table = '';
    
    switch(type) {
        case 'student': table = 'students'; break;
        case 'professor': table = 'professors'; break;
        case 'academy': table = 'academies'; break;
        case 'settings': table = 'theme_settings'; break;
        case 'event': table = 'events'; break;
        default: return res.status(400).send('Invalid type');
    }

    try {
        const query = table === 'theme_settings' 
            ? 'SELECT logoUrl as imageUrl FROM theme_settings WHERE id = ?'
            : `SELECT imageUrl FROM ${table} WHERE id = ?`;

        const [rows] = await pool.query(query, [id]);
        
        if (rows.length === 0 || !rows[0].imageUrl) {
            // Return a 1x1 transparent pixel or 404
            return res.status(404).send('Image not found');
        }

        const imgData = rows[0].imageUrl;

        if (imgData.startsWith('data:image')) {
            const matches = imgData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches.length !== 3) {
                return res.status(500).send('Invalid image data');
            }
            const type = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');

            res.writeHead(200, {
                'Content-Type': type,
                'Content-Length': buffer.length,
                'Cache-Control': 'public, max-age=86400'
            });
            res.end(buffer);
        } else {
            res.redirect(imgData);
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Error serving image');
    }
});

// --- API Routes ---

app.get('/api/public-data', async (req, res) => {
    try {
        const [[settings], [schedules], [academies]] = await Promise.all([
            pool.query('SELECT * FROM theme_settings LIMIT 1'),
            pool.query('SELECT * FROM class_schedules'),
            pool.query('SELECT id, name, address, responsible FROM academies WHERE status = "active"')
        ]);

        let parsedSettings = settings[0] || {};
        parsedSettings = { 
            ...parsedSettings, 
            useGradient: Boolean(parsedSettings.useGradient), 
            publicPageEnabled: Boolean(parsedSettings.publicPageEnabled), 
            registrationEnabled: Boolean(parsedSettings.registrationEnabled), 
            socialLoginEnabled: Boolean(parsedSettings.socialLoginEnabled),
            creditCardEnabled: Boolean(parsedSettings.creditCardEnabled),
            mercadoPagoAccessToken: undefined,
            mercadoPagoClientSecret: undefined,
            efiClientSecret: undefined,
            efiPixCert: undefined
        };

        const publicSchedules = schedules.map(s => {
            const academy = academies.find(a => a.id === s.academyId);
            return {
                ...s,
                academyName: academy ? academy.name : ''
            };
        });

        res.json({
            themeSettings: parsedSettings,
            schedules: publicSchedules
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching public data' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT id, name, email, role, academyId, studentId, birthDate FROM users WHERE email = ?', [email]);
        
        const checkAcademyStatus = async (academyId) => {
            if (!academyId) return true; 
            const [rows] = await pool.query('SELECT status FROM academies WHERE id = ?', [academyId]);
            if (rows.length > 0) {
                const status = rows[0].status;
                if (status === 'pending') throw new Error('Sua academia está em análise. Aguarde a aprovação do administrador.');
                if (status === 'rejected') throw new Error('O cadastro da sua academia foi recusado. Entre em contato com a suporte.');
                if (status === 'blocked') throw new Error('Acesso temporariamente suspenso. Entre em contato com a administração do sistema.');
            }
            return true;
        };

        if (users.length > 0) {
            const user = users[0];
            if (user.role !== 'general_admin') {
                await checkAcademyStatus(user.academyId);
            }

            pool.query('INSERT INTO activity_logs (id, actorId, action, timestamp, details) VALUES (?, ?, ?, ?, ?)', 
                [`log_${Date.now()}`, users[0].id, 'Login', new Date(), 'Login successful.']).catch(console.error);
            
            if (users[0].studentId) {
                pool.query('UPDATE students SET lastSeen = NOW() WHERE id = ?', [users[0].studentId]).catch(console.error);
            }

            return res.json({ user: users[0] });
        }

        const [students] = await pool.query('SELECT id, name, email, academyId, status, password, birthDate, imageUrl FROM students WHERE email = ? OR cpf = ?', [email, email]);
        if (students.length > 0 && (students[0].password === password || !students[0].password)) {
            const student = students[0];
            if (student.status === 'blocked') return res.status(403).json({ message: 'Seu acesso foi temporariamente bloqueado. Contate a administração.' });
            if (student.status === 'pending') return res.status(403).json({ message: 'Seu cadastro está aguardando aprovação da academia.' });

            await checkAcademyStatus(student.academyId);

            let imgUrl = undefined;
            if (student.imageUrl) {
                imgUrl = `/api/images/student/${student.id}`;
            }

            const userObj = { 
                id: `user_${student.id}`, 
                name: student.name, 
                email: student.email, 
                role: 'student', 
                academyId: student.academyId, 
                studentId: student.id, 
                birthDate: student.birthDate,
                imageUrl: imgUrl
            };
            
            pool.query('UPDATE students SET lastSeen = NOW() WHERE id = ?', [student.id]).catch(console.error);

            return res.json({ user: userObj });
        }
        
        const [academies] = await pool.query('SELECT id, status FROM academies WHERE email = ? AND password = ?', [email, password]);
        if (academies.length > 0) {
            const academy = academies[0];
            if (academy.status === 'pending') return res.status(403).json({ message: 'Sua academia está em análise. Aguarde a aprovação.' });
            if (academy.status === 'rejected') return res.status(403).json({ message: 'O cadastro da sua academia foi recusado.' });
            if (academy.status === 'blocked') return res.status(403).json({ message: 'Acesso temporariamente suspenso. Contate o administrador.' });

            const [adminUser] = await pool.query('SELECT id, name, email, role, academyId, studentId, birthDate FROM users WHERE academyId = ? AND role = "academy_admin"', [academy.id]);
            if (adminUser.length > 0) return res.json({ user: adminUser[0] });
        }

        res.status(401).json({ message: 'User or password invalid' });
    } catch (error) {
        console.error(error);
        const status = error.message.includes('em análise') || error.message.includes('recusado') || error.message.includes('suspenso') || error.message.includes('bloqueado') || error.message.includes('aprovação') ? 403 : 500;
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
            'INSERT INTO academies (id, name, address, responsible, responsibleRegistration, email, password, status, allowStudentRegistration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [academyId, name, address, responsible, responsibleRegistration, email, password, 'pending', true]
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

app.post('/api/register-student', async (req, res) => {
    const data = req.body;
    try {
        const id = `student_${Date.now()}`;
        if (data.birthDate) data.birthDate = data.birthDate.split('T')[0];
        
        const payload = {
            id,
            name: data.name,
            email: data.email,
            password: data.password,
            cpf: data.cpf,
            phone: data.phone,
            academyId: data.academyId,
            birthDate: data.birthDate,
            beltId: 'white', 
            stripes: 0,
            paymentStatus: 'unpaid',
            status: 'pending', 
            paymentDueDateDay: 10
        };

        const keys = Object.keys(payload).map(key => `\`${key}\``).join(',');
        const placeholders = Object.keys(payload).map(() => '?').join(',');
        const values = Object.values(payload);
        
        await pool.query(`INSERT INTO students (${keys}) VALUES (${placeholders})`, values);
        res.json({ success: true, message: 'Cadastro de aluno realizado. Aguarde aprovação.' });
        
    } catch(e) {
        console.error("Error registering student:", e);
        res.status(500).json({ message: e.message || 'Erro ao registrar aluno.' });
    }
});

// --- INITIAL DATA ENDPOINT ---
app.get('/api/initial-data', async (req, res) => {
    try {
        // ... (All schema migrations kept same as previous) ...
        try { await pool.query("SELECT mobileNavShowDashboard FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN mobileNavShowDashboard BOOLEAN DEFAULT TRUE, ADD COLUMN mobileNavShowSchedule BOOLEAN DEFAULT TRUE, ADD COLUMN mobileNavShowStudents BOOLEAN DEFAULT TRUE, ADD COLUMN mobileNavShowProfile BOOLEAN DEFAULT TRUE, ADD COLUMN mobileNavBgColor VARCHAR(50) DEFAULT '#ffffff', ADD COLUMN mobileNavActiveColor VARCHAR(50) DEFAULT '#f59e0b', ADD COLUMN mobileNavInactiveColor VARCHAR(50) DEFAULT '#94a3b8', ADD COLUMN mobileNavHeight INTEGER DEFAULT 60, ADD COLUMN mobileNavIconSize INTEGER DEFAULT 24, ADD COLUMN mobileNavBorderRadius INTEGER DEFAULT 0, ADD COLUMN mobileNavBottomMargin INTEGER DEFAULT 0, ADD COLUMN mobileNavFloating BOOLEAN DEFAULT FALSE"); }
        try { await pool.query("SELECT mobileNavVisible FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN mobileNavVisible BOOLEAN DEFAULT TRUE"); }
        try { await pool.query("SELECT creditCardEnabled FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN creditCardEnabled BOOLEAN DEFAULT TRUE, ADD COLUMN efiEnabled BOOLEAN DEFAULT FALSE, ADD COLUMN efiPixKey VARCHAR(255), ADD COLUMN efiPixCert LONGTEXT"); }
        try { await pool.query("SELECT mercadoPagoClientId FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN mercadoPagoClientId TEXT, ADD COLUMN mercadoPagoClientSecret TEXT"); }
        try { await pool.query("SELECT creditCardSurcharge FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN creditCardSurcharge REAL DEFAULT 0"); }
        try { await pool.query("SELECT allowStudentRegistration FROM academies LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE academies ADD COLUMN allowStudentRegistration BOOLEAN DEFAULT TRUE"); }
        try { await pool.query("ALTER TABLE students DROP CHECK students_chk_1").catch(() => {}); await pool.query("ALTER TABLE students MODIFY COLUMN paymentStatus VARCHAR(255)"); } catch (e) {}
        try { await pool.query("SELECT responsibleName FROM students LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE students ADD COLUMN responsibleName VARCHAR(255), ADD COLUMN responsiblePhone VARCHAR(255)"); }
        try { await pool.query("SELECT whatsappMessageTemplate FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN whatsappMessageTemplate TEXT"); }
        try { await pool.query("SELECT isSocialProject FROM students LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE students ADD COLUMN isSocialProject BOOLEAN DEFAULT FALSE, ADD COLUMN socialProjectName VARCHAR(255)"); }
        try { await pool.query("SELECT appName FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN appName TEXT, ADD COLUMN appIcon LONGTEXT"); }
        
        await pool.query(`CREATE TABLE IF NOT EXISTS events (id VARCHAR(255) PRIMARY KEY, academyId VARCHAR(255), title TEXT NOT NULL, description TEXT, imageUrl LONGTEXT, footerType VARCHAR(50) DEFAULT 'text', footerContent LONGTEXT, htmlContent LONGTEXT, startDate DATETIME, endDate DATETIME, active BOOLEAN DEFAULT TRUE, FOREIGN KEY (academyId) REFERENCES academies(id))`);
        await pool.query(`CREATE TABLE IF NOT EXISTS event_recipients (eventId VARCHAR(255), recipientId VARCHAR(255), PRIMARY KEY (eventId, recipientId), FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS schedule_students (scheduleId VARCHAR(255), studentId VARCHAR(255), PRIMARY KEY (scheduleId, studentId), FOREIGN KEY (scheduleId) REFERENCES class_schedules(id), FOREIGN KEY (studentId) REFERENCES students(id))`);
        await pool.query(`CREATE TABLE IF NOT EXISTS expenses (id VARCHAR(255) PRIMARY KEY, academyId VARCHAR(255), description TEXT, amount REAL, date DATE, FOREIGN KEY (academyId) REFERENCES academies(id))`);

        const studentCols = "id, name, email, birthDate, cpf, fjjpe_registration, phone, address, beltId, academyId, firstGraduationDate, lastPromotionDate, paymentStatus, paymentDueDateDay, stripes, isCompetitor, lastCompetition, medals, isInstructor, lastSeen, status, responsibleName, responsiblePhone, isSocialProject, socialProjectName, CASE WHEN imageUrl IS NOT NULL AND imageUrl != '' THEN 1 ELSE 0 END as hasImage, CASE WHEN documents IS NOT NULL AND documents != '' THEN 1 ELSE 0 END as hasDocuments";
        const academyCols = "id, name, address, responsible, responsibleRegistration, professorId, email, settings, status, allowStudentRegistration, CASE WHEN imageUrl IS NOT NULL AND imageUrl != '' THEN 1 ELSE 0 END as hasImage";
        const professorCols = "id, name, fjjpe_registration, cpf, academyId, graduationId, blackBeltDate, isInstructor, birthDate, status, CASE WHEN imageUrl IS NOT NULL AND imageUrl != '' THEN 1 ELSE 0 END as hasImage";

        const [
            [students],
            [payments],
            [users],
            [academies],
            [graduations],
            [professors],
            [schedules],
            [assistants],
            [enrolledStudents],
            [attendance],
            [logs],
            [expenses],
            [events],
            [recipients],
            [settings]
        ] = await Promise.all([
            pool.query(`SELECT ${studentCols} FROM students`),
            pool.query('SELECT * FROM payment_history WHERE date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)'), 
            pool.query('SELECT id, name, email, role, academyId, studentId, birthDate FROM users'),
            pool.query(`SELECT ${academyCols} FROM academies`),
            pool.query('SELECT * FROM graduations'),
            pool.query(`SELECT ${professorCols} FROM professors`),
            pool.query('SELECT * FROM class_schedules'),
            pool.query('SELECT * FROM schedule_assistants'),
            pool.query('SELECT * FROM schedule_students'),
            pool.query('SELECT * FROM attendance_records WHERE date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)'),
            pool.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 50'), 
            pool.query('SELECT * FROM expenses WHERE date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)'),
            pool.query('SELECT id, academyId, title, description, footerType, footerContent, startDate, endDate, active, CASE WHEN imageUrl IS NOT NULL AND imageUrl != '' THEN 1 ELSE 0 END as hasImage FROM events'),
            pool.query('SELECT * FROM event_recipients'),
            pool.query('SELECT * FROM theme_settings LIMIT 1')
        ]);

        const parsedStudents = students.map(s => ({ 
            ...s, 
            imageUrl: s.hasImage ? `/api/images/student/${s.id}` : null,
            documents: s.hasDocuments ? [] : [],
            isCompetitor: Boolean(s.isCompetitor),
            isInstructor: Boolean(s.isInstructor),
            isSocialProject: Boolean(s.isSocialProject),
            medals: s.medals ? JSON.parse(s.medals) : { gold: 0, silver: 0, bronze: 0 },
            status: s.status || 'active'
        }));
        
        parsedStudents.forEach(s => { s.paymentHistory = payments.filter(p => p.studentId === s.id); });
        
        const parsedAcademies = academies.map(a => ({
            ...a,
            imageUrl: a.hasImage ? `/api/images/academy/${a.id}` : null,
            settings: a.settings ? JSON.parse(a.settings) : {},
            status: a.status || 'active',
            allowStudentRegistration: a.allowStudentRegistration === 1 || a.allowStudentRegistration === true
        }));
        
        const parsedProfessors = professors.map(p => ({ 
            ...p, 
            imageUrl: p.hasImage ? `/api/images/professor/${p.id}` : null,
            isInstructor: Boolean(p.isInstructor), 
            status: p.status || 'active' 
        }));

        const parsedSchedules = schedules.map(s => ({ 
            ...s, 
            assistantIds: assistants.filter(a => a.scheduleId === s.id).map(a => a.assistantId), 
            studentIds: enrolledStudents.filter(es => es.scheduleId === s.id).map(es => es.studentId) 
        }));
        
        const parsedEvents = events.map(e => ({ 
            ...e, 
            imageUrl: e.hasImage ? `/api/images/event/${e.id}` : null,
            active: Boolean(e.active),
            targetAudience: recipients.filter(r => r.eventId === e.id).map(r => r.recipientId)
        }));

        let parsedSettings = settings[0] || {};
        parsedSettings = { 
            ...parsedSettings, 
            useGradient: Boolean(parsedSettings.useGradient), 
            publicPageEnabled: Boolean(parsedSettings.publicPageEnabled), 
            registrationEnabled: Boolean(parsedSettings.registrationEnabled), 
            socialLoginEnabled: Boolean(parsedSettings.socialLoginEnabled),
            studentProfileEditEnabled: Boolean(parsedSettings.studentProfileEditEnabled),
            mobileNavShowDashboard: Boolean(parsedSettings.mobileNavShowDashboard),
            mobileNavShowSchedule: Boolean(parsedSettings.mobileNavShowSchedule),
            mobileNavShowStudents: Boolean(parsedSettings.mobileNavShowStudents),
            mobileNavShowProfile: Boolean(parsedSettings.mobileNavShowProfile),
            mobileNavFloating: Boolean(parsedSettings.mobileNavFloating),
            mobileNavVisible: parsedSettings.mobileNavVisible === undefined || parsedSettings.mobileNavVisible === 1 || parsedSettings.mobileNavVisible === true,
            creditCardEnabled: Boolean(parsedSettings.creditCardEnabled),
            creditCardSurcharge: Number(parsedSettings.creditCardSurcharge || 0),
            efiEnabled: Boolean(parsedSettings.efiEnabled),
        };
        
        res.json({ students: parsedStudents, users, academies: parsedAcademies, graduations, professors: parsedProfessors, schedules: parsedSchedules, attendanceRecords: attendance, activityLogs: logs, themeSettings: parsedSettings, events: parsedEvents, expenses });
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

// ... (Other handlers like auto-promote, payments, etc., same as before but without cluster imports) ...
app.post('/api/students/auto-promote-stripes', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [students] = await conn.query("SELECT * FROM students WHERE status = 'active'");
        const [attendance] = await conn.query("SELECT * FROM attendance_records WHERE date >= DATE_SUB(NOW(), INTERVAL 2 YEAR)"); 
        const [graduations] = await conn.query("SELECT * FROM graduations");
        let promotedCount = 0;
        for (const student of students) {
            const belt = graduations.find(g => g.id === student.beltId);
            if (!belt) continue;
            const isBlackBelt = belt.name.toLowerCase().includes('preta') || belt.name.toLowerCase().includes('black');
            let monthsThreshold = 6;
            let maxStripes = 4;
            if (isBlackBelt) { monthsThreshold = 36; maxStripes = 6; }
            if (student.stripes >= maxStripes) continue;
            const lastDateStr = student.lastPromotionDate || student.firstGraduationDate;
            if (!lastDateStr) continue;
            const lastDate = new Date(lastDateStr);
            const today = new Date();
            const thresholdDate = new Date(today.getFullYear(), today.getMonth() - monthsThreshold, today.getDate());
            if (lastDate <= thresholdDate) {
                const relevantRecords = attendance.filter(r => r.studentId === student.id && new Date(r.date) >= lastDate);
                const totalRecords = relevantRecords.length;
                if (totalRecords === 0) continue;
                const presentCount = relevantRecords.filter(r => r.status === 'present').length;
                const attendanceRate = presentCount / totalRecords;
                if (attendanceRate >= 0.70) {
                    await conn.query('UPDATE students SET stripes = stripes + 1, lastPromotionDate = ? WHERE id = ?', [today.toISOString().split('T')[0], student.id]);
                    promotedCount++;
                }
            }
        }
        await conn.commit();
        res.json({ success: true, message: `${promotedCount} alunos/professores graduados automaticamente.` });
    } catch (error) { await conn.rollback(); console.error("Auto promotion error:", error); res.status(500).json({ message: 'Erro ao processar graduações automáticas.' }); } finally { conn.release(); }
});

app.post('/api/payments/credit-card', async (req, res) => {
    // ... Logic kept same as before ...
    const { studentId, amount, token, paymentMethodId, installments, payer } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [students] = await conn.query('SELECT s.email, s.name, s.academyId FROM students s WHERE s.id = ?', [studentId]);
        if (students.length === 0) throw new Error("Aluno não encontrado.");
        const student = students[0];
        const [academies] = await conn.query('SELECT settings FROM academies WHERE id = ?', [student.academyId]);
        let accessToken = null;
        let surcharge = 0;
        if (academies.length > 0 && academies[0].settings) {
            try {
                const acSettings = JSON.parse(academies[0].settings);
                if (acSettings.mercadoPagoAccessToken) {
                    accessToken = acSettings.mercadoPagoAccessToken;
                    surcharge = Number(acSettings.creditCardSurcharge || 0);
                }
            } catch (e) { }
        }
        if (!accessToken) {
            const [globalSettings] = await conn.query('SELECT mercadoPagoAccessToken, creditCardSurcharge FROM theme_settings LIMIT 1');
            if (globalSettings.length > 0) {
                accessToken = globalSettings[0].mercadoPagoAccessToken;
                surcharge = Number(globalSettings[0].creditCardSurcharge || 0);
            }
        }
        if (!accessToken) throw new Error("Configuração de pagamento (Mercado Pago) não encontrada.");
        const totalAmount = Number(amount) + surcharge;
        const paymentPayload = { transaction_amount: totalAmount, token: token, description: `Mensalidade - ${student.name}`, payment_method_id: paymentMethodId, payer: { email: payer.email || student.email || 'email@naoinformado.com', identification: payer.identification }, installments: Number(installments) || 1 };
        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `pay_${Date.now()}_${studentId}` }, body: JSON.stringify(paymentPayload) });
        const mpData = await mpResponse.json();
        if (!mpResponse.ok) throw new Error(mpData.message || 'Erro no processamento.');
        if (mpData.status !== 'approved') throw new Error(getFriendlyErrorMessage(mpData.status_detail));
        await conn.query('UPDATE students SET paymentStatus = ? WHERE id = ?', ['paid', studentId]);
        await conn.query('INSERT INTO payment_history (id, studentId, date, amount) VALUES (?, ?, ?, ?)', [`pay_mp_${mpData.id}`, studentId, new Date(), totalAmount]);
        await conn.commit();
        res.json({ success: true, paymentId: mpData.id });
    } catch (error) { await conn.rollback(); console.error(error); res.status(500).json({ message: error.message || 'Erro ao processar pagamento.' }); } finally { conn.release(); }
});

app.post('/api/students', createHandler('students'));
app.delete('/api/students/:id', deleteHandler('students'));
app.post('/api/students/:id/status', async (req, res) => { try { await pool.query('UPDATE students SET status = ? WHERE id = ?', [req.body.status, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/students/promote-instructor', async (req, res) => { const { studentId } = req.body; const conn = await pool.getConnection(); try { await conn.beginTransaction(); const [students] = await conn.query('SELECT * FROM students WHERE id = ?', [studentId]); if (students.length === 0) throw new Error("Student not found"); const student = students[0]; await conn.query('UPDATE students SET isInstructor = 1 WHERE id = ?', [studentId]); const professorId = `prof_inst_${student.id}`; const [existingProf] = await conn.query('SELECT id FROM professors WHERE cpf = ?', [student.cpf]); if (existingProf.length === 0) { await conn.query(`INSERT INTO professors (id, name, fjjpe_registration, cpf, academyId, graduationId, imageUrl, isInstructor, birthDate, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'active')`, [professorId, student.name, student.fjjpe_registration, student.cpf, student.academyId, student.beltId, student.imageUrl, student.birthDate]); } else { await conn.query('UPDATE professors SET isInstructor = 1, graduationId = ?, academyId = ? WHERE id = ?', [student.beltId, student.academyId, existingProf[0].id]); } await conn.commit(); res.json({ success: true }); } catch (error) { await conn.rollback(); res.status(500).json({ message: error.message }); } finally { conn.release(); } });
app.post('/api/students/demote-instructor', async (req, res) => { const { professorId } = req.body; const conn = await pool.getConnection(); try { await conn.beginTransaction(); const [professors] = await conn.query('SELECT cpf, isInstructor FROM professors WHERE id = ?', [professorId]); if (professors.length > 0) { const prof = professors[0]; if (prof.cpf) { await conn.query('UPDATE students SET isInstructor = 0 WHERE cpf = ?', [prof.cpf]); } await conn.query('DELETE FROM professors WHERE id = ?', [professorId]); } await conn.commit(); res.json({ success: true }); } catch (error) { await conn.rollback(); res.status(500).json({ message: error.message }); } finally { conn.release(); } });
app.post('/api/students/payment', async (req, res) => { const { studentId, status, amount } = req.body; const conn = await pool.getConnection(); try { await conn.beginTransaction(); await conn.query('UPDATE students SET paymentStatus = ? WHERE id = ?', [status, studentId]); if (status === 'paid') { await conn.query('INSERT INTO payment_history (id, studentId, date, amount) VALUES (?, ?, ?, ?)', [`pay_${Date.now()}`, studentId, new Date(), amount]); } await conn.commit(); res.json({ success: true }); } catch (error) { await conn.rollback(); res.status(500).json({ message: error.message }); } finally { conn.release(); } });
app.post('/api/professors', createHandler('professors'));
app.delete('/api/professors/:id', deleteHandler('professors'));
app.post('/api/professors/:id/status', async (req, res) => { try { await pool.query('UPDATE professors SET status = ? WHERE id = ?', [req.body.status, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/schedules', async (req, res) => { const { assistantIds, studentIds, ...schedule } = req.body; const sanitize = (val) => (val === '' || val === undefined ? null : val); schedule.professorId = sanitize(schedule.professorId); schedule.academyId = sanitize(schedule.academyId); schedule.requiredGraduationId = sanitize(schedule.requiredGraduationId); schedule.observations = sanitize(schedule.observations); const conn = await pool.getConnection(); try { await conn.beginTransaction(); const id = schedule.id || `schedule_${Date.now()}`; await conn.query(`INSERT INTO class_schedules (id, className, dayOfWeek, startTime, endTime, professorId, academyId, requiredGraduationId, observations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE className = VALUES(className), dayOfWeek = VALUES(dayOfWeek), startTime = VALUES(startTime), endTime = VALUES(endTime), professorId = VALUES(professorId), academyId = VALUES(academyId), requiredGraduationId = VALUES(requiredGraduationId), observations = VALUES(observations)`, [id, schedule.className, schedule.dayOfWeek, schedule.startTime, schedule.endTime, schedule.professorId, schedule.academyId, schedule.requiredGraduationId, schedule.observations]); await conn.query('DELETE FROM schedule_assistants WHERE scheduleId = ?', [id]); if (assistantIds && assistantIds.length > 0) { for (const assistId of assistantIds) { await conn.query('INSERT INTO schedule_assistants (scheduleId, assistantId) VALUES (?, ?)', [id, assistId]); } } await conn.query('DELETE FROM schedule_students WHERE scheduleId = ?', [id]); if (studentIds && studentIds.length > 0) { for (const studId of studentIds) { await conn.query('INSERT INTO schedule_students (scheduleId, studentId) VALUES (?, ?)', [id, studId]); } } await conn.commit(); res.json({ success: true }); } catch (error) { await conn.rollback(); res.status(500).send(error.message); } finally { conn.release(); } });
app.delete('/api/schedules/:id', async (req, res) => { try { await pool.query('DELETE FROM schedule_assistants WHERE scheduleId = ?', [req.params.id]); await pool.query('DELETE FROM schedule_students WHERE scheduleId = ?', [req.params.id]); await pool.query('DELETE FROM class_schedules WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch(e) { res.status(500).send(e.message); } });
app.post('/api/graduations', createHandler('graduations'));
app.delete('/api/graduations/:id', deleteHandler('graduations'));
app.post('/api/graduations/reorder', async (req, res) => { const items = req.body; const conn = await pool.getConnection(); try { await conn.beginTransaction(); for (const item of items) { await conn.query('UPDATE graduations SET `rank` = ? WHERE id = ?', [item.rank, item.id]); } await conn.commit(); res.json({ success: true }); } catch(e) { await conn.rollback(); res.status(500).send(e.message); } finally { conn.release(); } });
app.post('/api/settings', async (req, res) => { const s = req.body; const academyId = req.query.academyId; try { if (academyId) { const settingsJson = JSON.stringify(s); await pool.query('UPDATE academies SET settings = ? WHERE id = ?', [settingsJson, academyId]); } else { await pool.query(`UPDATE theme_settings SET systemName=?, logoUrl=?, primaryColor=?, secondaryColor=?, backgroundColor=?, cardBackgroundColor=?, buttonColor=?, buttonTextColor=?, iconColor=?, chartColor1=?, chartColor2=?, useGradient=?, reminderDaysBeforeDue=?, overdueDaysAfterDue=?, theme=?, monthlyFeeAmount=?, publicPageEnabled=?, registrationEnabled=?, heroHtml=?, aboutHtml=?, branchesHtml=?, footerHtml=?, customCss=?, customJs=?, socialLoginEnabled=?, googleClientId=?, facebookAppId=?, pixKey=?, pixHolderName=?, copyrightText=?, systemVersion=?, studentProfileEditEnabled=?, mercadoPagoAccessToken=?, mercadoPagoPublicKey=?, mercadoPagoClientId=?, mercadoPagoClientSecret=?, efiClientId=?, efiClientSecret=?, whatsappMessageTemplate=?, mobileNavShowDashboard=?, mobileNavShowSchedule=?, mobileNavShowStudents=?, mobileNavShowProfile=?, mobileNavBgColor=?, mobileNavActiveColor=?, mobileNavInactiveColor=?, mobileNavHeight=?, mobileNavIconSize=?, mobileNavBorderRadius=?, mobileNavBottomMargin=?, mobileNavFloating=?, mobileNavVisible=?, creditCardEnabled=?, efiEnabled=?, efiPixKey=?, efiPixCert=?, creditCardSurcharge=?, appName=?, appIcon=? WHERE id = 1`, [s.systemName, s.logoUrl, s.primaryColor, s.secondaryColor, s.backgroundColor, s.cardBackgroundColor, s.buttonColor, s.buttonTextColor, s.iconColor, s.chartColor1, s.chartColor2, s.useGradient, s.reminderDaysBeforeDue, s.overdueDaysAfterDue, s.theme, s.monthlyFeeAmount, s.publicPageEnabled, s.registrationEnabled, s.heroHtml, s.aboutHtml, s.branchesHtml, s.footerHtml, s.customCss, s.customJs, s.socialLoginEnabled, s.googleClientId, s.facebookAppId, s.pixKey, s.pixHolderName, s.copyrightText, s.systemVersion, s.studentProfileEditEnabled, s.mercadoPagoAccessToken, s.mercadoPagoPublicKey, s.mercadoPagoClientId, s.mercadoPagoClientSecret, s.efiClientId, s.efiClientSecret, s.whatsappMessageTemplate, s.mobileNavShowDashboard, s.mobileNavShowSchedule, s.mobileNavShowStudents, s.mobileNavShowProfile, s.mobileNavBgColor, s.mobileNavActiveColor, s.mobileNavInactiveColor, s.mobileNavHeight, s.mobileNavIconSize, s.mobileNavBorderRadius, s.mobileNavBottomMargin, s.mobileNavFloating, s.mobileNavVisible, s.creditCardEnabled, s.efiEnabled, s.efiPixKey, s.efiPixCert, s.creditCardSurcharge, s.appName, s.appIcon]); } res.json({ success: true }); } catch(e) { console.error(e); res.status(500).send(e.message); } });
app.post('/api/attendance', createHandler('attendance_records'));
app.post('/api/academies', createHandler('academies'));
app.post('/api/academies/:id/status', async (req, res) => { const { id } = req.params; const { status } = req.body; if (!['active', 'rejected', 'blocked'].includes(status)) return res.status(400).json({ message: 'Invalid status' }); try { await pool.query('UPDATE academies SET status = ? WHERE id = ?', [status, id]); res.json({ success: true }); } catch (error) { console.error("Error updating academy status:", error); res.status(500).json({ message: error.message }); } });
app.post('/api/events', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { targetAudience, ...data } = req.body;
        if (data.startDate) data.startDate = new Date(data.startDate).toISOString().slice(0, 19).replace('T', ' ');
        if (data.endDate) data.endDate = new Date(data.endDate).toISOString().slice(0, 19).replace('T', ' ');
        if (data.active !== undefined) data.active = data.active ? 1 : 0;
        let eventId = data.id;
        if (eventId) {
            const updateFields = Object.keys(data).filter(k => k !== 'id').map(key => `\`${key}\` = ?`).join(', ');
            const updateValues = Object.keys(data).filter(k => k !== 'id').map(k => data[k]);
            await conn.query(`UPDATE events SET ${updateFields} WHERE id = ?`, [...updateValues, eventId]);
        } else {
            eventId = `evt_${Date.now()}`;
            data.id = eventId;
            const keys = Object.keys(data).map(key => `\`${key}\``).join(',');
            const placeholders = Object.keys(data).map(() => '?').join(',');
            const values = Object.values(data);
            await conn.query(`INSERT INTO events (${keys}) VALUES (${placeholders})`, values);
        }
        await conn.query('DELETE FROM event_recipients WHERE eventId = ?', [eventId]);
        if (targetAudience && Array.isArray(targetAudience) && targetAudience.length > 0) {
            for (const recipientId of targetAudience) {
                await conn.query('INSERT INTO event_recipients (eventId, recipientId) VALUES (?, ?)', [eventId, recipientId]);
            }
        }
        await conn.commit();
        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        res.status(500).json({ message: e.message });
    } finally {
        conn.release();
    }
});
app.delete('/api/events/:id', deleteHandler('events'));
app.post('/api/events/:id/status', async (req, res) => { try { await pool.query('UPDATE events SET active = ? WHERE id = ?', [req.body.active ? 1 : 0, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/expenses', createHandler('expenses'));
app.post('/api/fjjpe/check', async (req, res) => {
    const { id, cpf } = req.body;
    if (!id || id === '0000') { return res.json({ status: 'missing', message: 'Sem FJJPE' }); }
    try {
        const cleanCpf = cpf.replace(/\D/g, '');
        const params = new URLSearchParams();
        params.append('id', id);
        params.append('cpf', cleanCpf);
        params.append('ok', 'Acessar ');
        const loginResponse = await fetch('https://fjjpe.com.br/fjjpe/verifica_usuario.php', {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            redirect: 'manual'
        });
        const rawCookies = loginResponse.headers.get('set-cookie');
        const locationHeader = loginResponse.headers.get('location');
        if (locationHeader && locationHeader.includes('index.php')) { return res.json({ status: 'inactive', message: 'Inativo na FJJPE' }); }
        let targetUrl = 'https://fjjpe.com.br/fjjpe/atualiza_atleta_res.php';
        if (locationHeader && !locationHeader.includes('index.php')) { if (locationHeader.startsWith('http')) { targetUrl = locationHeader; } else { targetUrl = `https://fjjpe.com.br/fjjpe/${locationHeader}`; } }
        const profileResponse = await fetch(targetUrl, {
            method: 'GET',
            headers: { 'Cookie': rawCookies || '', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const html = await profileResponse.text();
        const isActive = html.includes('CADASTRO ATIVO');
        if (isActive) { return res.json({ status: 'active', message: 'Ativo na FJJPE' }); } else { return res.json({ status: 'inactive', message: 'Inativo na FJJPE' }); }
    } catch (e) {
        console.error("FJJPE Check Error:", e);
        res.json({ status: 'inactive', error: e.message, message: 'Inativo na FJJPE' });
    }
});

// Wildcard handler for single page app (React Router)
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Build not found. Please run "npm run build".');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
