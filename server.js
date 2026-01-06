
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import cluster from 'cluster';
import os from 'os';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Clustering Setup for Performance ---
const numCPUs = os.cpus().length;

// In production, use clustering to utilize all cores. 
// In dev/container environments with single core alloc, this gracefully falls back.
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    // --- Worker Process Logic ---
    const app = express();
    const PORT = process.env.PORT || 3001;

    // Middleware
    app.use(cors());
    
    // Performance: Gzip Compression
    app.use(compression());

    // FIX: Increase payload limit to 50mb to handle Base64 images and certificates
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Serve static files from the React build
    app.use(express.static(path.join(__dirname, 'dist'), {
        maxAge: '1d', // Cache static assets for 1 day
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
                res.setHeader('Content-Type', 'application/javascript');
            } else if (filePath.endsWith('.css')) {
                res.setHeader('Content-Type', 'text/css');
            }
        }
    }));

    // Database Connection Optimization
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'paulocarecateam',
        password: process.env.DB_PASS || 'E6uoXi34ZwwAINCD5T25',
        database: process.env.DB_NAME || 'paulocarecateam',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true, // Keep connections open to reduce handshake overhead
        keepAliveInitialDelay: 0
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
            'cc_rejected_duplicated_payment': 'Você já efetuou um pagamento com esse valor. Caso precise pagar novamente, utilize outro cartão ou outra forma de pagamento.',
            'cc_rejected_high_risk': 'Seu pagamento foi recusado por segurança. Escolha outra forma de pagamento.',
            'cc_rejected_insufficient_amount': 'O cartão possui saldo insuficiente.',
            'cc_rejected_invalid_installments': 'O cartão não processa pagamentos nesta quantidade de parcelas.',
            'cc_rejected_max_attempts': 'Você atingiu o limite de tentativas permitidas. Escolha outro cartão ou outra forma de pagamento.',
            'cc_rejected_other_reason': 'O cartão não processou o pagamento.'
        };
        return errors[statusDetail] || `Pagamento recusado: ${statusDetail}`;
    };

    // --- API Routes ---

    app.post('/api/login', async (req, res) => {
        const { email, password } = req.body;
        try {
            const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            
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
                if (student.status === 'blocked') return res.status(403).json({ message: 'Seu acesso foi temporariamente bloqueado. Contate a administração.' });
                if (student.status === 'pending') return res.status(403).json({ message: 'Seu cadastro está aguardando aprovação da academia.' });

                await checkAcademyStatus(student.academyId);

                const userObj = { id: `user_${student.id}`, name: student.name, email: student.email, role: 'student', academyId: student.academyId, studentId: student.id, birthDate: student.birthDate };
                try { await pool.query('UPDATE students SET lastSeen = NOW() WHERE id = ?', [student.id]); } catch (e) { console.error("Could not update lastSeen", e); }

                return res.json({ user: userObj });
            }
            
            const [academies] = await pool.query('SELECT * FROM academies WHERE email = ? AND password = ?', [email, password]);
            if (academies.length > 0) {
                const academy = academies[0];
                if (academy.status === 'pending') return res.status(403).json({ message: 'Sua academia está em análise. Aguarde a aprovação.' });
                if (academy.status === 'rejected') return res.status(403).json({ message: 'O cadastro da sua academia foi recusado.' });
                if (academy.status === 'blocked') return res.status(403).json({ message: 'Acesso temporariamente suspenso. Contate o administrador.' });

                const [adminUser] = await pool.query('SELECT * FROM users WHERE academyId = ? AND role = "academy_admin"', [academy.id]);
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

    app.get('/api/initial-data', async (req, res) => {
        try {
            // ... (All migrations preserved) ...
            try { await pool.query("SELECT mobileNavShowDashboard FROM theme_settings LIMIT 1"); } catch (e) {
                await pool.query(`ALTER TABLE theme_settings 
                    ADD COLUMN mobileNavShowDashboard BOOLEAN DEFAULT TRUE,
                    ADD COLUMN mobileNavShowSchedule BOOLEAN DEFAULT TRUE,
                    ADD COLUMN mobileNavShowStudents BOOLEAN DEFAULT TRUE,
                    ADD COLUMN mobileNavShowProfile BOOLEAN DEFAULT TRUE,
                    ADD COLUMN mobileNavBgColor VARCHAR(50) DEFAULT '#ffffff',
                    ADD COLUMN mobileNavActiveColor VARCHAR(50) DEFAULT '#f59e0b',
                    ADD COLUMN mobileNavInactiveColor VARCHAR(50) DEFAULT '#94a3b8',
                    ADD COLUMN mobileNavHeight INTEGER DEFAULT 60,
                    ADD COLUMN mobileNavIconSize INTEGER DEFAULT 24,
                    ADD COLUMN mobileNavBorderRadius INTEGER DEFAULT 0,
                    ADD COLUMN mobileNavBottomMargin INTEGER DEFAULT 0,
                    ADD COLUMN mobileNavFloating BOOLEAN DEFAULT FALSE
                `);
            }
            try { await pool.query("SELECT mobileNavVisible FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN mobileNavVisible BOOLEAN DEFAULT TRUE"); }
            try { await pool.query("SELECT creditCardEnabled FROM theme_settings LIMIT 1"); } catch (e) {
                await pool.query(`ALTER TABLE theme_settings 
                    ADD COLUMN creditCardEnabled BOOLEAN DEFAULT TRUE,
                    ADD COLUMN efiEnabled BOOLEAN DEFAULT FALSE,
                    ADD COLUMN efiPixKey VARCHAR(255),
                    ADD COLUMN efiPixCert LONGTEXT
                `);
            }
            // Migration for Mercado Pago Client ID/Secret
            try { await pool.query("SELECT mercadoPagoClientId FROM theme_settings LIMIT 1"); } catch (e) { 
                await pool.query("ALTER TABLE theme_settings ADD COLUMN mercadoPagoClientId TEXT, ADD COLUMN mercadoPagoClientSecret TEXT"); 
            }

            try { await pool.query("SELECT creditCardSurcharge FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN creditCardSurcharge REAL DEFAULT 0"); }
            try { await pool.query("SELECT allowStudentRegistration FROM academies LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE academies ADD COLUMN allowStudentRegistration BOOLEAN DEFAULT TRUE"); }
            try { await pool.query("ALTER TABLE students DROP CHECK students_chk_1").catch(() => {}); await pool.query("ALTER TABLE students MODIFY COLUMN paymentStatus VARCHAR(255)"); } catch (e) {}
            try { await pool.query("SELECT responsibleName FROM students LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE students ADD COLUMN responsibleName VARCHAR(255), ADD COLUMN responsiblePhone VARCHAR(255)"); }
            try { await pool.query("SELECT whatsappMessageTemplate FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN whatsappMessageTemplate TEXT"); }
            try { await pool.query("SELECT isSocialProject FROM students LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE students ADD COLUMN isSocialProject BOOLEAN DEFAULT FALSE, ADD COLUMN socialProjectName VARCHAR(255)"); }
            try { await pool.query("SELECT appName FROM theme_settings LIMIT 1"); } catch (e) { await pool.query("ALTER TABLE theme_settings ADD COLUMN appName TEXT, ADD COLUMN appIcon LONGTEXT"); }
            
            // --- Migration for Events Table ---
            await pool.query(`CREATE TABLE IF NOT EXISTS events (
                id VARCHAR(255) PRIMARY KEY,
                academyId VARCHAR(255),
                title TEXT NOT NULL,
                description TEXT,
                imageUrl LONGTEXT,
                footerType VARCHAR(50) DEFAULT 'text',
                footerContent LONGTEXT,
                htmlContent LONGTEXT,
                startDate DATETIME,
                endDate DATETIME,
                active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (academyId) REFERENCES academies(id)
            )`);

            await pool.query(`CREATE TABLE IF NOT EXISTS event_recipients (
                eventId VARCHAR(255),
                recipientId VARCHAR(255),
                PRIMARY KEY (eventId, recipientId),
                FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
            )`);

            await pool.query(`CREATE TABLE IF NOT EXISTS schedule_students (scheduleId VARCHAR(255), studentId VARCHAR(255), PRIMARY KEY (scheduleId, studentId), FOREIGN KEY (scheduleId) REFERENCES class_schedules(id), FOREIGN KEY (studentId) REFERENCES students(id))`);

            // --- Migration for Expenses Table ---
            await pool.query(`CREATE TABLE IF NOT EXISTS expenses (
                id VARCHAR(255) PRIMARY KEY,
                academyId VARCHAR(255),
                description TEXT,
                amount REAL,
                date DATE,
                FOREIGN KEY (academyId) REFERENCES academies(id)
            )`);

            // PERFORMANCE: Execute queries in parallel using Promise.all to reduce Time To First Byte (TTFB)
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
                pool.query('SELECT * FROM students'),
                // Optimize: Limit payment history fetch if table grows too large in future
                pool.query('SELECT * FROM payment_history WHERE date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)'), 
                pool.query('SELECT * FROM users'),
                pool.query('SELECT * FROM academies'),
                pool.query('SELECT * FROM graduations'),
                pool.query('SELECT * FROM professors'),
                pool.query('SELECT * FROM class_schedules'),
                pool.query('SELECT * FROM schedule_assistants'),
                pool.query('SELECT * FROM schedule_students'),
                // Optimize: Limit attendance to last 12 months for initial load
                pool.query('SELECT * FROM attendance_records WHERE date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)'),
                pool.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 50'), // Reduced from 100 to 50
                pool.query('SELECT * FROM expenses WHERE date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)'),
                pool.query('SELECT * FROM events'),
                pool.query('SELECT * FROM event_recipients'),
                pool.query('SELECT * FROM theme_settings LIMIT 1')
            ]);

            const parsedStudents = students.map(s => ({ 
                ...s, 
                isCompetitor: Boolean(s.isCompetitor),
                isInstructor: Boolean(s.isInstructor),
                isSocialProject: Boolean(s.isSocialProject),
                medals: s.medals ? JSON.parse(s.medals) : { gold: 0, silver: 0, bronze: 0 },
                documents: s.documents ? JSON.parse(s.documents) : [],
                status: s.status || 'active'
            }));
            
            // Map payments in memory (faster than multiple SQL joins for this scale)
            parsedStudents.forEach(s => { s.paymentHistory = payments.filter(p => p.studentId === s.id); });
            
            const parsedAcademies = academies.map(a => ({
                ...a,
                settings: a.settings ? JSON.parse(a.settings) : {},
                status: a.status || 'active',
                allowStudentRegistration: a.allowStudentRegistration === 1 || a.allowStudentRegistration === true
            }));
            
            const parsedProfessors = professors.map(p => ({ ...p, isInstructor: Boolean(p.isInstructor), status: p.status || 'active' }));
            const parsedSchedules = schedules.map(s => ({ ...s, assistantIds: assistants.filter(a => a.scheduleId === s.id).map(a => a.assistantId), studentIds: enrolledStudents.filter(es => es.scheduleId === s.id).map(es => es.studentId) }));
            
            const parsedEvents = events.map(e => ({ 
                ...e, 
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
    app.post('/api/students/auto-promote-stripes', async (req, res) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [students] = await conn.query("SELECT * FROM students WHERE status = 'active'");
            const [attendance] = await conn.query("SELECT * FROM attendance_records");
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
                        const term = isBlackBelt ? 'grau na Faixa Preta' : 'grau';
                        await conn.query('INSERT INTO activity_logs (id, actorId, action, timestamp, details) VALUES (?, ?, ?, ?, ?)', [`log_${Date.now()}_${student.id}`, 'system', 'Auto Promotion', new Date(), `Aluno ${student.name} recebeu um ${term} automaticamente (Frequência: ${(attendanceRate * 100).toFixed(0)}%).`]);
                        promotedCount++;
                    }
                }
            }
            await conn.commit();
            res.json({ success: true, message: `${promotedCount} alunos/professores graduados automaticamente.` });
        } catch (error) { await conn.rollback(); console.error("Auto promotion error:", error); res.status(500).json({ message: 'Erro ao processar graduações automáticas.' }); } finally { conn.release(); }
    });

    // --- API Payments Credit Card ---
    app.post('/api/payments/credit-card', async (req, res) => {
        const { studentId, amount, token, paymentMethodId, installments, payer } = req.body;
        const conn = await pool.getConnection();
        
        try {
            await conn.beginTransaction();

            // 1. Get Student Data and Academy Link
            const [students] = await conn.query('SELECT s.email, s.name, s.academyId FROM students s WHERE s.id = ?', [studentId]);
            if (students.length === 0) throw new Error("Aluno não encontrado.");
            const student = students[0];

            // 2. Get Payment Settings (Prioritize Academy Specific, fallback to Global)
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
                } catch (e) { console.error("Error parsing academy settings", e); }
            }

            if (!accessToken) {
                const [globalSettings] = await conn.query('SELECT mercadoPagoAccessToken, creditCardSurcharge FROM theme_settings LIMIT 1');
                if (globalSettings.length > 0) {
                    accessToken = globalSettings[0].mercadoPagoAccessToken;
                    surcharge = Number(globalSettings[0].creditCardSurcharge || 0);
                }
            }

            if (!accessToken) throw new Error("Configuração de pagamento (Mercado Pago) não encontrada.");

            // 3. Prepare Payment Payload
            const totalAmount = Number(amount) + surcharge;
            const paymentPayload = {
                transaction_amount: totalAmount,
                token: token,
                description: `Mensalidade - ${student.name}`,
                payment_method_id: paymentMethodId,
                payer: {
                    email: payer.email || student.email || 'email@naoinformado.com',
                    identification: payer.identification
                },
                installments: Number(installments) || 1
            };

            // 4. Call Mercado Pago API
            const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': `pay_${Date.now()}_${studentId}`
                },
                body: JSON.stringify(paymentPayload)
            });

            const mpData = await mpResponse.json();

            if (!mpResponse.ok) {
                console.error("Mercado Pago Payment Error:", mpData);
                const errorDetail = mpData.message || (mpData.cause && mpData.cause[0]?.description) || 'Erro desconhecido no processamento.';
                const specificError = new Error(errorDetail);
                // @ts-ignore
                specificError.status = 400; // Set status to 400 for validation errors
                throw specificError;
            }

            if (mpData.status !== 'approved') {
                const statusDetail = mpData.status_detail;
                const friendlyMessage = getFriendlyErrorMessage(statusDetail);
                const err = new Error(friendlyMessage);
                // @ts-ignore
                err.status = 400; // Client side error
                throw err;
            }

            // 5. Update Database on Success
            await conn.query('UPDATE students SET paymentStatus = ? WHERE id = ?', ['paid', studentId]);
            await conn.query(
                'INSERT INTO payment_history (id, studentId, date, amount) VALUES (?, ?, ?, ?)', 
                [`pay_mp_${mpData.id}`, studentId, new Date(), totalAmount]
            );

            await conn.commit();
            res.json({ success: true, paymentId: mpData.id });

        } catch (error) {
            await conn.rollback();
            console.error("Credit Card Payment Error:", error);
            const status = error.status || 500;
            res.status(status).json({ message: error.message || 'Erro ao processar pagamento.' });
        } finally {
            conn.release();
        }
    });

    // ... (Rest of the app.post handlers remain the same) ...
    app.post('/api/students', async (req, res) => {
        const data = req.body;
        try {
            const ALLOWED_COLUMNS = [ 'name', 'email', 'password', 'birthDate', 'cpf', 'fjjpe_registration', 'phone', 'address', 'beltId', 'academyId', 'firstGraduationDate', 'lastPromotionDate', 'paymentStatus', 'paymentDueDateDay', 'imageUrl', 'stripes', 'isCompetitor', 'lastCompetition', 'medals', 'isInstructor', 'lastSeen', 'status', 'documents', 'responsibleName', 'responsiblePhone', 'isSocialProject', 'socialProjectName' ];
            const payload = {};
            for (const key of ALLOWED_COLUMNS) { if (data[key] !== undefined) payload[key] = data[key]; }
            if (payload.medals && typeof payload.medals === 'object') payload.medals = JSON.stringify(payload.medals);
            if (payload.documents && typeof payload.documents === 'object') payload.documents = JSON.stringify(payload.documents);
            for (const key of ['birthDate', 'firstGraduationDate', 'lastPromotionDate', 'lastSeen']) { if (payload[key] && typeof payload[key] === 'string' && key !== 'lastSeen') { payload[key] = payload[key].split('T')[0]; } else if (payload[key] === '') { payload[key] = null; } }
            if (payload.isCompetitor !== undefined) payload.isCompetitor = payload.isCompetitor ? 1 : 0;
            if (payload.isInstructor !== undefined) payload.isInstructor = payload.isInstructor ? 1 : 0;
            if (payload.isSocialProject !== undefined) payload.isSocialProject = payload.isSocialProject ? 1 : 0;
            if (payload.password === '' || payload.password === undefined) delete payload.password;

            if (data.id) {
                const updateKeys = Object.keys(payload);
                if (updateKeys.length === 0) return res.json({ success: true, id: data.id, message: "No fields to update." });
                const updateFields = updateKeys.map(key => `\`${key}\` = ?`).join(', ');
                const updateValues = Object.values(payload);
                await pool.query(`UPDATE students SET ${updateFields} WHERE id = ?`, [...updateValues, data.id]);
                res.json({ success: true, id: data.id });
            } else {
                const id = `student_${Date.now()}`;
                payload.id = id;
                if (payload.paymentStatus === undefined) payload.paymentStatus = 'unpaid';
                if (payload.stripes === undefined) payload.stripes = 0;
                if (payload.status === undefined) payload.status = 'active';
                const keys = Object.keys(payload).map(key => `\`${key}\``).join(',');
                const placeholders = Object.keys(payload).map(() => '?').join(',');
                const values = Object.values(payload);
                await pool.query(`INSERT INTO students (${keys}) VALUES (${placeholders})`, values);
                res.json({ success: true, id });
            }
        } catch(e) { console.error("Error saving student:", e.message); res.status(500).json({ message: e.message }); }
    });
    app.delete('/api/students/:id', deleteHandler('students'));
    app.post('/api/students/:id/status', async (req, res) => { try { await pool.query('UPDATE students SET status = ? WHERE id = ?', [req.body.status, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
    app.post('/api/students/promote-instructor', async (req, res) => {
        const { studentId } = req.body; const conn = await pool.getConnection();
        try { await conn.beginTransaction(); const [students] = await conn.query('SELECT * FROM students WHERE id = ?', [studentId]); if (students.length === 0) throw new Error("Student not found"); const student = students[0]; await conn.query('UPDATE students SET isInstructor = 1 WHERE id = ?', [studentId]); const professorId = `prof_inst_${student.id}`; const [existingProf] = await conn.query('SELECT id FROM professors WHERE cpf = ?', [student.cpf]); if (existingProf.length === 0) { await conn.query(`INSERT INTO professors (id, name, fjjpe_registration, cpf, academyId, graduationId, imageUrl, isInstructor, birthDate, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'active')`, [professorId, student.name, student.fjjpe_registration, student.cpf, student.academyId, student.beltId, student.imageUrl, student.birthDate]); } else { await conn.query('UPDATE professors SET isInstructor = 1, graduationId = ?, academyId = ? WHERE id = ?', [student.beltId, student.academyId, existingProf[0].id]); } await conn.commit(); res.json({ success: true }); } catch (error) { await conn.rollback(); console.error("Error promoting student:", error); res.status(500).json({ message: error.message }); } finally { conn.release(); }
    });
    app.post('/api/students/demote-instructor', async (req, res) => {
        const { professorId } = req.body; const conn = await pool.getConnection();
        try { await conn.beginTransaction(); const [professors] = await conn.query('SELECT cpf, isInstructor FROM professors WHERE id = ?', [professorId]); if (professors.length > 0) { const prof = professors[0]; if (prof.cpf) { await conn.query('UPDATE students SET isInstructor = 0 WHERE cpf = ?', [prof.cpf]); } await conn.query('DELETE FROM professors WHERE id = ?', [professorId]); } await conn.commit(); res.json({ success: true }); } catch (error) { await conn.rollback(); console.error("Error demoting instructor:", error); res.status(500).json({ message: error.message }); } finally { conn.release(); }
    });
    app.post('/api/students/payment', async (req, res) => {
        const { studentId, status, amount } = req.body; const conn = await pool.getConnection();
        try { await conn.beginTransaction(); await conn.query('UPDATE students SET paymentStatus = ? WHERE id = ?', [status, studentId]); if (status === 'paid') { await conn.query('INSERT INTO payment_history (id, studentId, date, amount) VALUES (?, ?, ?, ?)', [`pay_${Date.now()}`, studentId, new Date(), amount]); } await conn.commit(); res.json({ success: true }); } catch (error) { await conn.rollback(); console.error("Error processing payment:", error); res.status(500).json({ message: error.message || 'Erro ao processar pagamento.' }); } finally { conn.release(); }
    });
    app.post('/api/professors', async (req, res) => { try { const data = req.body; if (data.blackBeltDate && typeof data.blackBeltDate === 'string') data.blackBeltDate = data.blackBeltDate.split('T')[0]; else if (data.blackBeltDate === '') data.blackBeltDate = null; if (data.birthDate && typeof data.birthDate === 'string') data.birthDate = data.birthDate.split('T')[0]; else if (data.birthDate === '') data.birthDate = null; data.isInstructor = data.hasOwnProperty('isInstructor') && data.isInstructor ? 1 : 0; if (data.id) { const { id, ...updateData } = data; const updateFields = Object.keys(updateData).map(key => `\`${key}\` = ?`).join(', '); const updateValues = Object.values(updateData); await pool.query(`UPDATE professors SET ${updateFields} WHERE id = ?`, [...updateValues, id]); } else { data.id = `prof_${Date.now()}`; if (!data.status) data.status = 'active'; const keys = Object.keys(data).map(key => `\`${key}\``).join(','); const placeholders = Object.keys(data).map(() => '?').join(','); const values = Object.values(data); await pool.query(`INSERT INTO professors (${keys}) VALUES (${placeholders})`, values); } res.json({ success: true }); } catch (error) { console.error(`Error in professors:`, error); res.status(500).json({ message: error.message }); } });
    app.delete('/api/professors/:id', deleteHandler('professors'));
    app.post('/api/professors/:id/status', async (req, res) => { try { await pool.query('UPDATE professors SET status = ? WHERE id = ?', [req.body.status, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
    app.post('/api/schedules', async (req, res) => { const { assistantIds, studentIds, ...schedule } = req.body; const sanitize = (val) => (val === '' || val === undefined ? null : val); schedule.professorId = sanitize(schedule.professorId); schedule.academyId = sanitize(schedule.academyId); schedule.requiredGraduationId = sanitize(schedule.requiredGraduationId); schedule.observations = sanitize(schedule.observations); const conn = await pool.getConnection(); try { await conn.beginTransaction(); const id = schedule.id || `schedule_${Date.now()}`; await conn.query(`INSERT INTO class_schedules (id, className, dayOfWeek, startTime, endTime, professorId, academyId, requiredGraduationId, observations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE className = VALUES(className), dayOfWeek = VALUES(dayOfWeek), startTime = VALUES(startTime), endTime = VALUES(endTime), professorId = VALUES(professorId), academyId = VALUES(academyId), requiredGraduationId = VALUES(requiredGraduationId), observations = VALUES(observations)`, [id, schedule.className, schedule.dayOfWeek, schedule.startTime, schedule.endTime, schedule.professorId, schedule.academyId, schedule.requiredGraduationId, schedule.observations]); await conn.query('DELETE FROM schedule_assistants WHERE scheduleId = ?', [id]); if (assistantIds && assistantIds.length > 0) { for (const assistId of assistantIds) { await conn.query('INSERT INTO schedule_assistants (scheduleId, assistantId) VALUES (?, ?)', [id, assistId]); } } await conn.query('DELETE FROM schedule_students WHERE scheduleId = ?', [id]); if (studentIds && studentIds.length > 0) { for (const studId of studentIds) { await conn.query('INSERT INTO schedule_students (scheduleId, studentId) VALUES (?, ?)', [id, studId]); } } await conn.commit(); res.json({ success: true }); } catch (error) { await conn.rollback(); console.error("Error saving schedule:", error); res.status(500).send(error.message); } finally { conn.release(); } });
    app.delete('/api/schedules/:id', async (req, res) => { try { await pool.query('DELETE FROM schedule_assistants WHERE scheduleId = ?', [req.params.id]); await pool.query('DELETE FROM schedule_students WHERE scheduleId = ?', [req.params.id]); await pool.query('DELETE FROM class_schedules WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch(e) { res.status(500).send(e.message); } });
    app.post('/api/graduations', createHandler('graduations'));
    app.delete('/api/graduations/:id', deleteHandler('graduations'));
    app.post('/api/graduations/reorder', async (req, res) => { const items = req.body; const conn = await pool.getConnection(); try { await conn.beginTransaction(); for (const item of items) { await conn.query('UPDATE graduations SET `rank` = ? WHERE id = ?', [item.rank, item.id]); } await conn.commit(); res.json({ success: true }); } catch(e) { await conn.rollback(); res.status(500).send(e.message); } finally { conn.release(); } });
    app.post('/api/settings', async (req, res) => { const s = req.body; const academyId = req.query.academyId; try { if (academyId) { const settingsJson = JSON.stringify(s); await pool.query('UPDATE academies SET settings = ? WHERE id = ?', [settingsJson, academyId]); } else { await pool.query(`UPDATE theme_settings SET systemName=?, logoUrl=?, primaryColor=?, secondaryColor=?, backgroundColor=?, cardBackgroundColor=?, buttonColor=?, buttonTextColor=?, iconColor=?, chartColor1=?, chartColor2=?, useGradient=?, reminderDaysBeforeDue=?, overdueDaysAfterDue=?, theme=?, monthlyFeeAmount=?, publicPageEnabled=?, registrationEnabled=?, heroHtml=?, aboutHtml=?, branchesHtml=?, footerHtml=?, customCss=?, customJs=?, socialLoginEnabled=?, googleClientId=?, facebookAppId=?, pixKey=?, pixHolderName=?, copyrightText=?, systemVersion=?, studentProfileEditEnabled=?, mercadoPagoAccessToken=?, mercadoPagoPublicKey=?, mercadoPagoClientId=?, mercadoPagoClientSecret=?, efiClientId=?, efiClientSecret=?, whatsappMessageTemplate=?, mobileNavShowDashboard=?, mobileNavShowSchedule=?, mobileNavShowStudents=?, mobileNavShowProfile=?, mobileNavBgColor=?, mobileNavActiveColor=?, mobileNavInactiveColor=?, mobileNavHeight=?, mobileNavIconSize=?, mobileNavBorderRadius=?, mobileNavBottomMargin=?, mobileNavFloating=?, mobileNavVisible=?, creditCardEnabled=?, efiEnabled=?, efiPixKey=?, efiPixCert=?, creditCardSurcharge=?, appName=?, appIcon=? WHERE id = 1`, [s.systemName, s.logoUrl, s.primaryColor, s.secondaryColor, s.backgroundColor, s.cardBackgroundColor, s.buttonColor, s.buttonTextColor, s.iconColor, s.chartColor1, s.chartColor2, s.useGradient, s.reminderDaysBeforeDue, s.overdueDaysAfterDue, s.theme, s.monthlyFeeAmount, s.publicPageEnabled, s.registrationEnabled, s.heroHtml, s.aboutHtml, s.branchesHtml, s.footerHtml, s.customCss, s.customJs, s.socialLoginEnabled, s.googleClientId, s.facebookAppId, s.pixKey, s.pixHolderName, s.copyrightText, s.systemVersion, s.studentProfileEditEnabled, s.mercadoPagoAccessToken, s.mercadoPagoPublicKey, s.mercadoPagoClientId, s.mercadoPagoClientSecret, s.efiClientId, s.efiClientSecret, s.whatsappMessageTemplate, s.mobileNavShowDashboard, s.mobileNavShowSchedule, s.mobileNavShowStudents, s.mobileNavShowProfile, s.mobileNavBgColor, s.mobileNavActiveColor, s.mobileNavInactiveColor, s.mobileNavHeight, s.mobileNavIconSize, s.mobileNavBorderRadius, s.mobileNavBottomMargin, s.mobileNavFloating, s.mobileNavVisible, s.creditCardEnabled, s.efiEnabled, s.efiPixKey, s.efiPixCert, s.creditCardSurcharge, s.appName, s.appIcon]); } res.json({ success: true }); } catch(e) { console.error(e); res.status(500).send(e.message); } });
    app.post('/api/attendance', createHandler('attendance_records'));
    app.post('/api/academies', async (req, res) => { const data = req.body; if (data.settings && typeof data.settings === 'object') data.settings = JSON.stringify(data.settings); const keys = Object.keys(data).map(key => `\`${key}\``); const values = Object.values(data).map(v => v); try { await pool.query(`REPLACE INTO academies (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, values); res.json({ success: true }); } catch (e) { console.error(e); res.status(500).json({ message: e.message }); } });
    app.post('/api/academies/:id/status', async (req, res) => { const { id } = req.params; const { status } = req.body; if (!['active', 'rejected', 'blocked'].includes(status)) return res.status(400).json({ message: 'Invalid status' }); try { await pool.query('UPDATE academies SET status = ? WHERE id = ?', [status, id]); res.json({ success: true }); } catch (error) { console.error("Error updating academy status:", error); res.status(500).json({ message: error.message }); } });

    // --- Events API ---
    app.post('/api/events', async (req, res) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const { targetAudience, ...data } = req.body;
            // Format dates
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

            // Handle Recipients
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
            console.error("Error saving event:", e);
            res.status(500).json({ message: e.message });
        } finally {
            conn.release();
        }
    });
    app.delete('/api/events/:id', deleteHandler('events'));
    app.post('/api/events/:id/status', async (req, res) => { try { await pool.query('UPDATE events SET active = ? WHERE id = ?', [req.body.active ? 1 : 0, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });

    // --- Expenses API ---
    app.post('/api/expenses', createHandler('expenses'));

    // --- FJJPE Status Check Endpoint ---
    app.post('/api/fjjpe/check', async (req, res) => {
        const { id, cpf } = req.body;

        if (!id || id === '0000') {
            return res.json({ status: 'missing', message: 'Sem FJJPE' });
        }

        try {
            const cleanCpf = cpf.replace(/\D/g, '');
            
            // 1. Prepare POST data
            const params = new URLSearchParams();
            params.append('id', id);
            params.append('cpf', cleanCpf);
            params.append('ok', 'Acessar '); // Exact button text from HTML

            // 2. Perform POST request to verify user (login)
            // 'redirect: manual' allows us to inspect headers and handle the redirect logic ourselves
            const loginResponse = await fetch('https://fjjpe.com.br/fjjpe/verifica_usuario.php', {
                method: 'POST',
                body: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                redirect: 'manual'
            });

            // 3. Extract Session Cookie
            const rawCookies = loginResponse.headers.get('set-cookie');
            const locationHeader = loginResponse.headers.get('location');

            // Logic Check:
            // If it redirects to 'index.php', it usually means login failed.
            if (locationHeader && locationHeader.includes('index.php')) {
                return res.json({ status: 'inactive', message: 'Inativo na FJJPE' });
            }

            // If it redirects (302) to another page (likely 'atualiza_atleta_res.php' or similar)
            // OR if we just proceed to check the profile page using the cookie.
            let targetUrl = 'https://fjjpe.com.br/fjjpe/atualiza_atleta_res.php';
            
            if (locationHeader && !locationHeader.includes('index.php')) {
                // Use the redirect target if it's not index.php
                if (locationHeader.startsWith('http')) {
                    targetUrl = locationHeader;
                } else {
                    targetUrl = `https://fjjpe.com.br/fjjpe/${locationHeader}`;
                }
            }

            // 4. Fetch the profile page with the session cookie
            const profileResponse = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                    'Cookie': rawCookies || '',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const html = await profileResponse.text();

            // 5. Analyze HTML for "CADASTRO ATIVO" button
            const isActive = html.includes('CADASTRO ATIVO');

            if (isActive) {
                return res.json({ status: 'active', message: 'Ativo na FJJPE' });
            } else {
                return res.json({ status: 'inactive', message: 'Inativo na FJJPE' });
            }

        } catch (e) {
            console.error("FJJPE Check Error:", e);
            // Default to inactive/error state if connection fails
            res.json({ status: 'inactive', error: e.message, message: 'Inativo na FJJPE' });
        }
    });

    app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'dist', 'index.html')); });
    app.listen(PORT, () => { console.log(`Worker ${process.pid} running on port ${PORT}`); });
}
