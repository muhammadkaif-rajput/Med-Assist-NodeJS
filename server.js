const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers & Session Setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: 'med_assist_secret_key_12345!',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Middlewares
function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/auth/login');
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.redirect('/auth/login');
    }
    if (req.session.userRole !== role) {
      return res.status(403).send('Unauthorized access.');
    }
    next();
  };
}

// Global variables for templates
app.use((req, res, next) => {
  res.locals.userId = req.session ? req.session.userId : null;
  res.locals.userName = req.session ? req.session.userName : null;
  res.locals.userRole = req.session ? req.session.userRole : null;
  next();
});

// Helper sanitization
function sanitize(input) {
  if (!input) return '';
  return String(input).replace(/<[^>]*>/g, '').trim();
}

// Helper: Wikipedia REST API page summary
async function getWikiSummary(term) {
  try {
    const url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(term);
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.extract || null;
  } catch (err) {
    return null;
  }
}

// -------------------------------------------------------------
// LANDING & AUTHENTICATION
// -------------------------------------------------------------
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect(`/${req.session.userRole}/dashboard`);
  }
  res.render('index');
});

app.get('/auth/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect(`/${req.session.userRole}/dashboard`);
  }
  res.render('auth/login', { error: null });
});

app.post('/auth/login', async (req, res) => {
  const email = sanitize(req.body.email);
  const password = req.body.password;
  const role = req.body.role;

  if (!email || !password || !role) {
    return res.render('auth/login', { error: 'Please fill in all fields.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (isMatch) {
      if (user.role === role) {
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userRole = user.role;
        return res.redirect(`/${user.role}/dashboard`);
      } else {
        return res.render('auth/login', { error: 'Invalid role selected for this account.' });
      }
    } else {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }
  } catch (err) {
    console.error(err);
    res.render('auth/login', { error: 'Database error occurred.' });
  }
});

app.get('/auth/register', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect(`/${req.session.userRole}/dashboard`);
  }
  res.render('auth/register', { error: null, success: null });
});

app.post('/auth/register', async (req, res) => {
  const name = sanitize(req.body.name);
  const email = sanitize(req.body.email);
  const password = req.body.password;
  const phone = sanitize(req.body.phone);
  const age = parseInt(req.body.age) || null;
  const gender = sanitize(req.body.gender);
  let role = sanitize(req.body.role) || 'patient';

  // Only allow patient or admin during self-registration
  if (role !== 'admin') {
    role = 'patient';
  }

  if (!name || !email || !password) {
    return res.render('auth/register', { error: 'Name, email, and password are required.', success: null });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.render('auth/register', { error: 'This email is already registered.', success: null });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(password, salt);

    await db.query(
      'INSERT INTO users (name, email, password, phone, age, gender, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashed, phone, age, gender, role]
    );

    res.render('auth/register', { error: null, success: 'Account created successfully!' });
  } catch (err) {
    console.error(err);
    res.render('auth/register', { error: 'Registration failed. Try again.', success: null });
  }
});

// Admin-specific registration form
app.get('/auth/admin-register', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect(`/${req.session.userRole}/dashboard`);
  }
  res.render('auth/admin-register', { error: null, success: null });
});

app.post('/auth/admin-register', async (req, res) => {
  const name = sanitize(req.body.name);
  const email = sanitize(req.body.email);
  const password = req.body.password;
  const phone = sanitize(req.body.phone);
  const age = parseInt(req.body.age) || null;
  const gender = sanitize(req.body.gender);
  const role = 'admin';

  if (!name || !email || !password) {
    return res.render('auth/admin-register', { error: 'Name, email, and password are required.', success: null });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.render('auth/admin-register', { error: 'This email is already registered.', success: null });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(password, salt);

    await db.query(
      'INSERT INTO users (name, email, password, phone, age, gender, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashed, phone, age, gender, role]
    );

    res.render('auth/admin-register', { error: null, success: 'Admin account created successfully!' });
  } catch (err) {
    console.error(err);
    res.render('auth/admin-register', { error: 'Registration failed. Try again.', success: null });
  }
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// -------------------------------------------------------------
// PATIENT VIEWS & LOGIC
// -------------------------------------------------------------
app.get('/patient/dashboard', requireRole('patient'), async (req, res) => {
  try {
    const [pendingRes] = await db.query(
      'SELECT COUNT(*) AS count FROM appointments WHERE patient_id = ? AND status = ?',
      [req.session.userId, 'Pending']
    );
    const pendingCount = pendingRes[0].count;

    const [recentAppointments] = await db.query(
      'SELECT a.*, u.name AS name, d.specialization FROM appointments a JOIN users u ON a.doctor_id = u.id JOIN doctors d ON u.id = d.id WHERE a.patient_id = ? ORDER BY a.appointment_date DESC LIMIT 3',
      [req.session.userId]
    );

    res.render('patient/dashboard', {
      activePage: 'dashboard',
      pendingCount,
      recentAppointments
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/patient/symptoms', requireRole('patient'), async (req, res) => {
  try {
    const [symptoms] = await db.query('SELECT name FROM symptoms ORDER BY name');
    const allSymptoms = symptoms.map(s => s.name);
    res.render('patient/symptoms', {
      activePage: 'symptoms',
      allSymptoms,
      inputSymptoms: '',
      words: [],
      analysisResult: null,
      wikiSummaries: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/patient/symptoms', requireRole('patient'), async (req, res) => {
  const sMPT_string = sanitize(req.body.sMPT_string || '');
  try {
    const [symptomsList] = await db.query('SELECT name FROM symptoms ORDER BY name');
    const allSymptoms = symptomsList.map(s => s.name);

    if (!sMPT_string) {
      return res.render('patient/symptoms', {
        activePage: 'symptoms',
        allSymptoms,
        inputSymptoms: '',
        words: [],
        analysisResult: null,
        wikiSummaries: {}
      });
    }

    // ─── 1. Urdu → English medical symptom mapping ───────────────────────────
    const urduToEnglish = {
      'urine issue': 'frequent urination, painful urination', 'urine problem': 'frequent urination, painful urination',
      'peshab ka masla': 'frequent urination, painful urination', 'peshab me jalan': 'painful urination',
      'baar baar peshab': 'frequent urination', 'tez bukhar': 'high fever',
      'bukhar': 'fever', 'sardi': 'cold', 'khansi aana': 'cough', 'khansi': 'cough',
      'nazla': 'runny nose', 'sar me dard': 'headache', 'sardard': 'headache',
      'sar dard': 'headache', 'pait dard': 'abdominal pain', 'petdard': 'abdominal pain',
      'pet dard': 'abdominal pain', 'ulti aana': 'nausea', 'ulti': 'vomiting',
      'matli': 'nausea', 'dast': 'diarrhea', 'qabz': 'constipation',
      'peshaab': 'frequent urination', 'peshab': 'frequent urination', 'pishab': 'frequent urination',
      'pesha': 'frequent urination', 'urin': 'frequent urination', 'urine': 'frequent urination',
      'kamzori': 'fatigue', 'thakan': 'fatigue', 'neend': 'insomnia',
      'khujli': 'itching', 'daane': 'rash', 'jalan': 'burning sensation',
      'cheenti': 'swelling', 'sujan': 'swelling', 'dard': 'pain',
      'seene me dard': 'chest pain', 'chhati dard': 'chest pain',
      'seene': 'chest pain', 'sans': 'shortness of breath', 'bp': 'blood pressure',
      'sugar': 'blood sugar', 'diabetes': 'blood sugar',
      'aankhon me dard': 'eye redness', 'aankhon se paani': 'eye redness',
      'moo me chale': 'sore throat', 'gala dard': 'sore throat',
      'joron me dard': 'joint pain', 'kamar dard': 'back pain',
      'pair dard': 'muscle pain', 'haath dard': 'muscle pain',
      'khoon aana': 'bleeding', 'khoon': 'bleeding', 'zakhm': 'wound',
      'bukhaar': 'fever', 'peth': 'abdominal pain',
    };

    // ─── 2. Synonym map: common words → canonical DB symptom names ────────────
    const synonymMap = {
      'pimple':    'Pimples',          'pimples':  'Pimples',
      'acne':      'Acne',             'spots':    'Pimples',
      'blackhead': 'Acne',             'zit':      'Pimples',
      'hair':      'Hair Loss',        'hairfall': 'Hair Loss',
      'bald':      'Hair Loss',        'alopecia': 'Hair Loss',
      'sleep':     'Insomnia',         'sleepless':'Insomnia',
      'worry':     'Anxiety',          'stress':   'Anxiety',
      'nervous':   'Anxiety',          'panic':    'Anxiety',
      'bloat':     'Bloating',         'bloated':  'Bloating',
      'constipated':'Constipation',    'gassy':    'Bloating',
      'swollen':   'Swelling',         'swelling': 'Swelling',
      'urine':     'Frequent Urination','urination':'Frequent Urination',
      'urinate':   'Frequent Urination','burning':  'Burning Sensation',
      'joint':     'Joint Pain',       'joints':   'Joint Pain',
      'stiff':     'Stiffness',        'stiffness':'Stiffness',
      'back':      'Back Pain',        'backache': 'Back Pain',
      'muscle':    'Muscle Pain',      'muscles':  'Muscle Pain',
      'stomach':   'Abdominal Pain',   'tummy':    'Abdominal Pain',
      'belly':     'Abdominal Pain',   'abdomen':  'Abdominal Pain',
      'chest':     'Chest Pain',       'breath':   'Shortness of Breath',
      'breathing': 'Shortness of Breath',
      'eye':       'Eye Redness',      'eyes':     'Eye Redness',
      'itchy':     'Itching',          'itch':     'Itching',
      'skin':      'Skin Rash',        'rash':     'Rash',
      'weak':      'Fatigue',          'tired':    'Fatigue', 'tiredness':'Fatigue',
      'dizzy':     'Dizziness',        'diziness': 'Dizziness',
      'vomit':     'Vomiting',         'nauseous': 'Nausea',
      'sneeze':    'Runny Nose',       'sneezing': 'Runny Nose',
      'throat':    'Sore Throat',      'coughing': 'Cough',
      'feverish':  'Fever',            'temperature':'Fever',
      'headache':  'Headache',         'migraine': 'Headache',
    };

    // ─── 3. Known medical symptom keywords ───────────────────────────────────
    const medicalKeywords = new Set([
      'fever','cough','cold','flu','headache','migraine','nausea','vomiting',
      'diarrhea','constipation','fatigue','weakness','dizziness','vertigo',
      'chest pain','breathless','back pain','joint pain',
      'muscle pain','sore throat','throat','runny nose','rash','itching',
      'swelling','bleeding','pain','ache','infection','urination','urinary',
      'urine','kidney','bladder','burning','frequent urination','stomach','abdominal',
      'cramps','acid','heartburn','indigestion','gas','bloating','skin',
      'allergy','acne','pimples','hair loss','weight loss','weight gain',
      'anxiety','depression','insomnia','palpitation','heart','cardiac',
      'blood pressure','hypertension','diabetes','cholesterol',
      'eye pain','vision','ear','hearing','tinnitus','mouth ulcer','toothache',
      'gum','nose','sinus','liver','jaundice','hepatitis',
      'kidney stone','gallstone','inflammation','discharge',
    ]);

    // ─── 4. Stop words (non-medical noise) ───────────────────────────────────
    const stopWords = new Set([
      'i','have','feel','like','a','the','my','me','is','am','are','of','to',
      'and','in','with','for','on','at','it','this','that','from','by','an',
      'was','were','been','be','has','had','do','does','did','but','or','so',
      'if','when','then','there','here','who','what','where','why','how',
      'which','about','very','too','much','more','some','any','no','not',
      'yes','ok','please','hello','hi','dr','doctor','think','seems','got',
      'getting','having','also','just','only','already','still','since',
      'problem','issue','problems','issues','something','little','lot',
      'mujhay','mjhe','mujhe','lgta','lagta','lag','lga','ye','yeh','hoa',
      'hua','h','hai','he','tha','thi','ko','se','ka','ki','ke','aur','bhi',
      'toh','tou','ya','na','nahi','kuch','ek','aik','teen','chaar','paanch',
      'sath','gya','rha','raha','rhi','rahi','rhe','rahe','kar','kr','krna',
      'karna','kro','karo','kre','kare','ho','mein','par','pe','pr','say',
      'sy','wo','woh','un','us','use','usi','apne','apni','apna','mera',
      'meri','mere','tum','aap','ap','hum','ham','hamari','hamara','sub',
      'sab','sabhi','bilkul','thoda','kam','bohot','bahut','zyada','ziada',
      'lg','rah','hona','hone','houn','hu','huwa','gaya','gayi','gaye',
      'karta','karti','karte','karan','kiya','kia','keya','hogayi','hogya',
      'hogia','hogyi','gyi','aye','aya','ayi','ana','jana','jaye','aaye',
      'aaya','aayi','chal','hoga','hogi','hoge','chahiye','chahye','chahie',
      'hamy','hamay','humay','humko','hamko','inko','unko','usko','isko',
      'phir','phr','agr','agar','lekin','magar','warna','kyun','kyunke',
      'isliye','islye','tab','jab','abhi','pehle','baad','saath','bina',
      'sirf','bas','hi','bhar','tak','wala','wali','wale','walay',
      'ne','ny','nay','de','dy','day','lo','le','ly',
    ]);

    // ─── 5. Translate Urdu phrases (longest first to avoid partial clashes) ──
    let processedInput = sMPT_string.toLowerCase();
    const sortedUrduKeys = Object.keys(urduToEnglish).sort((a, b) => b.length - a.length);
    for (const urdu of sortedUrduKeys) {
      processedInput = processedInput.replace(new RegExp(urdu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), urduToEnglish[urdu]);
    }

    // ─── 6. Determine input items ─────────────────────────────────────────────
    let detectedSymptoms = [];
    const allSymptomsLower = allSymptoms.map(s => s.toLowerCase());

    // Helper: resolve a single word/phrase to a canonical DB symptom name
    function resolveToSymptom(part) {
      // 1. Exact DB match
      const exactIdx = allSymptomsLower.findIndex(s => s === part);
      if (exactIdx !== -1) return allSymptoms[exactIdx];
      // 2. Synonym map (e.g. "pimple" → "Pimples")
      if (synonymMap[part]) return synonymMap[part];
      // 3. Partial DB match
      const partialIdx = allSymptomsLower.findIndex(s => s.includes(part) || part.includes(s));
      if (partialIdx !== -1) return allSymptoms[partialIdx];
      // 4. Check medical keywords
      if (medicalKeywords.has(part) && !stopWords.has(part)) return part;
      // 5. If completely unknown, return it as capitalized new symptom
      return part.charAt(0).toUpperCase() + part.slice(1);
    }

    let newSymptomsToSave = [];

    if (sMPT_string.includes(',')) {
      // ── Comma mode: each comma-separated item = one symptom phrase ──────────
      // processedInput may have expanded "urine issue" to "frequent urination, painful urination"
      const parts = processedInput.split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 1);
      for (const part of parts) {
        const resolved = resolveToSymptom(part);
        if (resolved && !detectedSymptoms.includes(resolved)) {
          detectedSymptoms.push(resolved);
          if (!allSymptomsLower.includes(resolved.toLowerCase()) && !newSymptomsToSave.includes(resolved)) {
            newSymptomsToSave.push(resolved);
          }
        }
      }
    } else {
      // ── Free-text mode: extract word-by-word, apply synonym map first ────────
      const cleanInput = processedInput.replace(/[^a-zA-Z0-9\s]/g, '');
      const rawWords = cleanInput.split(/\s+/);
      for (const rw of rawWords) {
        const trimmed = rw.trim().toLowerCase();
        if (trimmed.length < 3 || stopWords.has(trimmed)) continue;

        // Check synonymMap first (covers "pimple", "tired", "burning" etc.)
        if (synonymMap[trimmed]) {
          const sym = synonymMap[trimmed];
          if (!detectedSymptoms.includes(sym)) detectedSymptoms.push(sym);
          continue;
        }

        // Then check medical keywords or assume it's a symptom
        const resolved = resolveToSymptom(trimmed);
        if (resolved && !detectedSymptoms.includes(resolved)) {
          detectedSymptoms.push(resolved);
          if (!allSymptomsLower.includes(resolved.toLowerCase()) && !newSymptomsToSave.includes(resolved)) {
            newSymptomsToSave.push(resolved);
          }
        }
      }
    }

    // Insert new symptoms into the database
    if (newSymptomsToSave.length > 0) {
      for (const newSym of newSymptomsToSave) {
        try {
          await db.query('INSERT IGNORE INTO symptoms (name) VALUES (?)', [newSym]);
        } catch (e) {
          console.error("Failed to insert new symptom:", newSym, e);
        }
      }
    }

    // ─── 6. Fetch Wikipedia info ──────────────────────────────────────────────
    const wikiSummaries = {};
    for (const symptom of detectedSymptoms) {
      const searchTerms = [symptom + ' symptom', symptom + ' medical condition', symptom];
      for (const term of searchTerms) {
        const summary = await getWikiSummary(term);
        if (summary && summary.length > 50) {
          wikiSummaries[symptom] = summary;
          break;
        }
      }
    }

    if (detectedSymptoms.length === 0) {
      const fullPhraseSummary = await getWikiSummary(sMPT_string.trim());
      if (fullPhraseSummary && fullPhraseSummary.length > 50) {
        wikiSummaries['_full'] = fullPhraseSummary;
      }
    }

    // ─── 7. Match detected symptoms against database ──────────────────────────
    let analysisResult = [];
    if (detectedSymptoms.length > 0) {
      const symptomConditions = detectedSymptoms.map(() => 's.name LIKE ?');
      const params = detectedSymptoms.map(w => `%${w}%`);
      const sql = `
        SELECT DISTINCT d.disease_id, d.name AS disease_name, d.severity, d.description,
          (SELECT m.name FROM medicines m JOIN disease_medicines dm ON m.medicine_id = dm.medicine_id WHERE dm.disease_id = d.disease_id LIMIT 1) AS medicine,
          (SELECT m.dosage FROM medicines m JOIN disease_medicines dm ON m.medicine_id = dm.medicine_id WHERE dm.disease_id = d.disease_id LIMIT 1) AS dosage,
          (SELECT a.recommendation FROM advice a JOIN disease_advice da ON a.advice_id = da.advice_id WHERE da.disease_id = d.disease_id LIMIT 1) AS advice_text
        FROM disease_symptoms ds
        JOIN symptoms s ON ds.symptom_id = s.symptom_id
        JOIN diseases d ON ds.disease_id = d.disease_id
        WHERE (${symptomConditions.join(' OR ')}) LIMIT 5
      `;
      const [resList] = await db.query(sql, params);
      analysisResult = resList;
    }

    res.render('patient/symptoms', {
      activePage: 'symptoms',
      allSymptoms,
      inputSymptoms: sMPT_string,
      words: detectedSymptoms,
      analysisResult,
      wikiSummaries
    });
  } catch (err) {
    console.error('Symptom analysis error:', err);
    res.status(500).send('Server error');
  }
});

app.get('/patient/book-appointment', requireRole('patient'), async (req, res) => {
  try {
    const [doctors] = await db.query(
      "SELECT u.id, u.name, d.specialization FROM users u JOIN doctors d ON u.id = d.id WHERE u.role = 'doctor'"
    );
    res.render('patient/book-appointment', {
      activePage: 'book-appointment',
      doctors,
      message: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/patient/book-appointment', requireRole('patient'), async (req, res) => {
  const doctorId = parseInt(req.body.doctor_id);
  const date = sanitize(req.body.appointment_date);

  try {
    const [doctors] = await db.query(
      "SELECT u.id, u.name, d.specialization FROM users u JOIN doctors d ON u.id = d.id WHERE u.role = 'doctor'"
    );

    if (doctorId && date) {
      await db.query(
        "INSERT INTO appointments (patient_id, doctor_id, appointment_date, status) VALUES (?, ?, ?, 'Pending')",
        [req.session.userId, doctorId, date]
      );
      res.render('patient/book-appointment', {
        activePage: 'book-appointment',
        doctors,
        message: "Appointment booked successfully!"
      });
    } else {
      res.render('patient/book-appointment', {
        activePage: 'book-appointment',
        doctors,
        message: "Error booking appointment. Please fill in all fields."
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/patient/appointments', requireRole('patient'), async (req, res) => {
  try {
    const [appointments] = await db.query(
      "SELECT a.*, u.name AS doctor_name, d.specialization FROM appointments a JOIN users u ON a.doctor_id = u.id JOIN doctors d ON u.id = d.id WHERE a.patient_id = ? ORDER BY a.appointment_date DESC",
      [req.session.userId]
    );

    res.render('patient/appointments', {
      activePage: 'appointments',
      appointments
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/patient/print-prescription', requireRole('patient'), async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  try {
    const [appointments] = await db.query(
      `SELECT a.*, 
              u_doc.name AS doctor_name, d.specialization, d.location AS doctor_contact,
              u_pat.name AS patient_name, u_pat.email AS patient_email, u_pat.gender, u_pat.phone AS patient_phone
       FROM appointments a
       JOIN users u_doc ON a.doctor_id = u_doc.id
       JOIN doctors d ON u_doc.id = d.id
       JOIN users u_pat ON a.patient_id = u_pat.id
       WHERE a.appointment_id = ? AND a.patient_id = ? AND a.status = 'Completed'`,
      [id, req.session.userId]
    );

    if (appointments.length === 0) {
      return res.status(404).send('Prescription report not found or appointment is not completed.');
    }

    res.render('patient/print-prescription', {
      appointment: appointments[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/patient/vitals', requireRole('patient'), async (req, res) => {
  try {
    const [vitalLogs] = await db.query(
      "SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY logged_at DESC",
      [req.session.userId]
    );
    res.render('patient/vitals', {
      activePage: 'vitals',
      vitalLogs,
      message: null,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/patient/vitals', requireRole('patient'), async (req, res) => {
  const bp = sanitize(req.body.blood_pressure || '');
  const bs = req.body.blood_sugar ? parseFloat(req.body.blood_sugar) : null;
  const hr = req.body.heart_rate ? parseInt(req.body.heart_rate) : null;
  const weight = req.body.weight ? parseFloat(req.body.weight) : null;
  const temp = req.body.temperature ? parseFloat(req.body.temperature) : null;

  try {
    await db.query(
      `INSERT INTO patient_vitals (patient_id, blood_pressure, blood_sugar, heart_rate, weight, temperature)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.session.userId, bp, bs, hr, weight, temp]
    );

    const [vitalLogs] = await db.query(
      "SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY logged_at DESC",
      [req.session.userId]
    );

    res.render('patient/vitals', {
      activePage: 'vitals',
      vitalLogs,
      message: "Vitals logged successfully!",
      error: null
    });
  } catch (err) {
    console.error(err);
    const [vitalLogs] = await db.query(
      "SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY logged_at DESC",
      [req.session.userId]
    );
    res.render('patient/vitals', {
      activePage: 'vitals',
      vitalLogs,
      message: null,
      error: "Failed to log vitals."
    });
  }
});

app.get('/patient/medicines', requireRole('patient'), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (req.query.delete_id) {
      const del_id = parseInt(req.query.delete_id);
      await db.query("DELETE FROM patient_medicines WHERE id = ? AND patient_id = ?", [del_id, req.session.userId]);
      return res.redirect('/patient/medicines');
    }

    const [medicines] = await db.query(
      `SELECT pm.*, ml.status AS today_status 
       FROM patient_medicines pm
       LEFT JOIN medicine_logs ml ON pm.id = ml.medicine_id AND ml.log_date = ?
       WHERE pm.patient_id = ?
       ORDER BY FIELD(pm.time_of_day, 'Morning', 'Afternoon', 'Night', 'As Needed'), pm.created_at DESC`,
      [today, req.session.userId]
    );

    res.render('patient/medicines', {
      activePage: 'medicines',
      medicines,
      message: null,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/patient/medicines', requireRole('patient'), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  
  try {
    if (req.body.add_medicine !== undefined) {
      const med_name = sanitize(req.body.medicine_name || '');
      const dosage = sanitize(req.body.dosage || '');
      const time_of_day = sanitize(req.body.time_of_day || '');
      const food_rel = sanitize(req.body.relation_to_food || '');

      if (!med_name || !dosage || !time_of_day || !food_rel) {
        const [medicines] = await db.query(
          `SELECT pm.*, ml.status AS today_status 
           FROM patient_medicines pm
           LEFT JOIN medicine_logs ml ON pm.id = ml.medicine_id AND ml.log_date = ?
           WHERE pm.patient_id = ?
           ORDER BY pm.created_at DESC`, [today, req.session.userId]
        );
        return res.render('patient/medicines', {
          activePage: 'medicines',
          medicines,
          message: null,
          error: "All fields are required to add a medicine."
        });
      }

      await db.query(
        `INSERT INTO patient_medicines (patient_id, medicine_name, dosage, time_of_day, relation_to_food)
         VALUES (?, ?, ?, ?, ?)`,
        [req.session.userId, med_name, dosage, time_of_day, food_rel]
      );
    } else if (req.body.log_intake !== undefined) {
      const med_id = parseInt(req.body.medicine_id);
      const status = sanitize(req.body.status || req.body.log_intake);

      if (status === 'Reset') {
        await db.query("DELETE FROM medicine_logs WHERE medicine_id = ? AND log_date = ?", [med_id, today]);
      } else {
        await db.query(
          `INSERT INTO medicine_logs (medicine_id, log_date, status)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status)`,
          [med_id, today, status]
        );
      }
    }

    res.redirect('/patient/medicines');

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/patient/diabetes-predict', requireRole('patient'), async (req, res) => {
  res.render('patient/diabetes-predict', { activePage: 'diabetes-predict', message: null, result: null });
});

app.post('/patient/diabetes-predict', requireRole('patient'), (req, res) => {
  const data = {
    pregnancies: parseInt(req.body.pregnancies) || 0,
    glucose:     parseInt(req.body.glucose)     || 0,
    bp:          parseInt(req.body.bp)          || 0,
    skin:        parseInt(req.body.skin)        || 0,
    insulin:     parseInt(req.body.insulin)     || 0,
    bmi:         parseFloat(req.body.bmi)       || 0,
    dpf:         parseFloat(req.body.dpf)       || 0,
    age:         parseInt(req.body.age)         || 0
  };

  const scriptPath = path.join(__dirname, 'predict_diabetes.py');
  const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
  const py = spawn(pythonCmd, [scriptPath]);

  let stdout = '';
  let stderr = '';

  py.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  py.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  py.on('close', (code) => {
    if (code !== 0) {
      console.error('Python error:', stderr);
      return res.render('patient/diabetes-predict', {
        activePage: 'diabetes-predict',
        message: 'Prediction failed. Make sure Python & model files are correct.',
        result: null
      });
    }
    let result = null;
    try {
      result = JSON.parse(stdout.trim());
    } catch (e) {
      console.error('JSON parse error:', e, '| stdout:', stdout);
      return res.render('patient/diabetes-predict', {
        activePage: 'diabetes-predict',
        message: 'Could not read prediction result.',
        result: null
      });
    }
    if (result.error) {
      return res.render('patient/diabetes-predict', {
        activePage: 'diabetes-predict',
        message: result.error,
        result: null
      });
    }
    res.render('patient/diabetes-predict', { activePage: 'diabetes-predict', message: null, result });
  });

  // Send JSON to Python via stdin
  py.stdin.write(JSON.stringify(data));
  py.stdin.end();
});

app.get('/patient/diet-tracker', requireRole('patient'), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const [waterSum] = await db.query(
      "SELECT SUM(amount_ml) AS total FROM water_logs WHERE patient_id = ? AND DATE(logged_at) = ?",
      [req.session.userId, today]
    );
    const waterToday = waterSum[0].total || 0;
    const waterGoal = 2000;
    const waterPct = Math.min(100, Math.round((waterToday / waterGoal) * 100));

    const [vitals] = await db.query(
      "SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY logged_at DESC LIMIT 1",
      [req.session.userId]
    );
    const latestVitals = vitals[0] || null;

    const dietAdvice = [];
    if (latestVitals) {
      if (latestVitals.blood_sugar !== null) {
        if (latestVitals.blood_sugar > 140) {
          dietAdvice.push({
            type: 'Sugar Alert',
            icon: 'fa-candy-cane',
            color: 'red',
            title: 'High Blood Sugar Diet Advice',
            desc: 'Restrict refined carbohydrates, sweet juices, desserts, white bread, and pasta. Increase soluble fiber intake (beans, oats, lentils) and focus on healthy proteins and non-starchy vegetables.'
          });
        } else if (latestVitals.blood_sugar < 70) {
          dietAdvice.push({
            type: 'Sugar Alert',
            icon: 'fa-cookie',
            color: 'amber',
            title: 'Low Blood Sugar Diet Advice',
            desc: 'Keep fast-acting carbs nearby (fruits, honey, juice) for emergencies. Focus on complex carbohydrates combined with proteins (whole wheat toast with peanut butter) to sustain stable sugar levels.'
          });
        }
      }

      if (latestVitals.blood_pressure) {
        const bpParts = latestVitals.blood_pressure.split('/');
        const sys = parseInt(bpParts[0]) || 120;
        const dia = parseInt(bpParts[1]) || 80;
        if (sys >= 130 || dia >= 80) {
          dietAdvice.push({
            type: 'BP Alert',
            icon: 'fa-salt-shaker',
            color: 'red',
            title: 'High Blood Pressure (DASH Diet)',
            desc: 'Significantly reduce sodium (salt) intake. Avoid processed meats, canned soups, pickles, and chips. Incorporate foods high in potassium, calcium, and magnesium (bananas, avocados, yogurt, and leafy greens).'
          });
        }
      }

      if (latestVitals.temperature !== null) {
        if (latestVitals.temperature >= 99.5) {
          dietAdvice.push({
            type: 'Fever Alert',
            icon: 'fa-mug-hot',
            color: 'amber',
            title: 'Fever Recovery Plan',
            desc: 'Drink plenty of warm broths, herbal teas, and water to replace fluids lost due to perspiration. Eat light, easy-to-digest foods like bananas, rice, applesauce, and toast (BRAT diet).'
          });
        }
      }

      if (dietAdvice.length === 0) {
        dietAdvice.push({
          type: 'Optimal Status',
          icon: 'fa-heart',
          color: 'green',
          title: 'Optimal Vitals Diet Guide',
          desc: 'Your recorded vitals are in the healthy range! Continue a healthy balanced diet: 50% vegetables & fruits, 25% lean proteins, and 25% whole grains. Stay hydrated and active!'
        });
      }
    } else {
      dietAdvice.push({
        type: 'No Data',
        icon: 'fa-info-circle',
        color: 'blue',
        title: 'Personalized Diet Plans',
        desc: 'No vitals logged yet. Go to the "My Vitals Log" page and enter your blood pressure, sugar, or temperature readings to unlock customized clinical dietary recommendations.'
      });
    }

    res.render('patient/diet-tracker', {
      activePage: 'diet-tracker',
      waterToday,
      waterGoal,
      waterPct,
      latestVitals,
      dietAdvice,
      message: null,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/patient/diet-tracker', requireRole('patient'), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (req.body.log_water !== undefined) {
      const amount = parseInt(req.body.log_water);
      if (amount > 0 && amount <= 1000) {
        await db.query("INSERT INTO water_logs (patient_id, amount_ml) VALUES (?, ?)", [req.session.userId, amount]);
      }
    } else if (req.body.reset_water !== undefined) {
      await db.query("DELETE FROM water_logs WHERE patient_id = ? AND DATE(logged_at) = ?", [req.session.userId, today]);
    }

    res.redirect('/patient/diet-tracker');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/patient/messages', requireRole('patient'), async (req, res) => {
  const activeDoctorId = parseInt(req.query.doctor_id) || 0;
  try {
    const [doctorsList] = await db.query(
      `SELECT DISTINCT u.id, u.name, d.specialization 
       FROM users u
       JOIN doctors d ON u.id = d.id
       ORDER BY u.name ASC`
    );

    if (activeDoctorId > 0) {
      await db.query(
        "UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE",
        [activeDoctorId, req.session.userId]
      );
    }

    let chatMessages = [];
    if (activeDoctorId > 0) {
      const [msgList] = await db.query(
        `SELECT * FROM messages 
         WHERE (sender_id = ? AND receiver_id = ?) 
            OR (sender_id = ? AND receiver_id = ?) 
         ORDER BY sent_at ASC`,
        [req.session.userId, activeDoctorId, activeDoctorId, req.session.userId]
      );
      chatMessages = msgList;
    }

    res.render('patient/messages', {
      activePage: 'messages',
      doctors: doctorsList,
      activeDoctorId,
      chatMessages,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/patient/messages', requireRole('patient'), async (req, res) => {
  const doctorId = parseInt(req.body.doctor_id);
  const msgText = sanitize(req.body.message_text);

  try {
    if (doctorId && msgText) {
      await db.query(
        "INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)",
        [req.session.userId, doctorId, msgText]
      );
      res.redirect(`/patient/messages?doctor_id=${doctorId}`);
    } else {
      res.redirect('/patient/messages');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// -------------------------------------------------------------
// DOCTOR PORTAL
// -------------------------------------------------------------
app.get('/doctor/dashboard', requireRole('doctor'), async (req, res) => {
  try {
    const [pendingRes] = await db.query(
      "SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ? AND status = 'Pending'",
      [req.session.userId]
    );
    const pendingCount = pendingRes[0].count;

    const [recentAppointments] = await db.query(
      `SELECT a.*, u.name AS patient_name, u.gender, u.age 
       FROM appointments a 
       JOIN users u ON a.patient_id = u.id 
       WHERE a.doctor_id = ? 
       ORDER BY a.appointment_date DESC LIMIT 5`,
      [req.session.userId]
    );

    res.render('doctor/dashboard', {
      activePage: 'dashboard',
      pendingCount,
      recentAppointments
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/doctor/appointments', requireRole('doctor'), async (req, res) => {
  try {
    const [appointments] = await db.query(
      `SELECT a.*, u.id AS patient_user_id, u.name AS patient_name, u.age, u.gender 
       FROM appointments a 
       JOIN users u ON a.patient_id = u.id 
       WHERE a.doctor_id = ? 
       ORDER BY a.appointment_date DESC`,
      [req.session.userId]
    );

    res.render('doctor/appointments', {
      activePage: 'appointments',
      appointments,
      message: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/doctor/appointments', requireRole('doctor'), async (req, res) => {
  try {
    let msg = '';
    if (req.body.action !== undefined && req.body.appointment_id !== undefined) {
      const appointment_id = parseInt(req.body.appointment_id);
      const action = req.body.action;

      if (['Confirmed', 'Completed', 'Cancelled'].includes(action)) {
        if (action === 'Completed') {
          const prescription = sanitize(req.body.prescription || '');
          const doctor_notes = sanitize(req.body.doctor_notes || '');
          await db.query(
            "UPDATE appointments SET status = ?, prescription = ?, doctor_notes = ? WHERE appointment_id = ? AND doctor_id = ?",
            [action, prescription, doctor_notes, appointment_id, req.session.userId]
          );
        } else {
          await db.query(
            "UPDATE appointments SET status = ? WHERE appointment_id = ? AND doctor_id = ?",
            [action, appointment_id, req.session.userId]
          );
        }
        msg = `Appointment updated to ${action}.`;
      }
    } else if (req.body.update_prescription !== undefined && req.body.appointment_id !== undefined) {
      const appointment_id = parseInt(req.body.appointment_id);
      const prescription = sanitize(req.body.prescription || '');
      const doctor_notes = sanitize(req.body.doctor_notes || '');

      await db.query(
        "UPDATE appointments SET prescription = ?, doctor_notes = ? WHERE appointment_id = ? AND doctor_id = ?",
        [prescription, doctor_notes, appointment_id, req.session.userId]
      );
      msg = "Prescription and notes updated successfully.";
    }

    const [appointments] = await db.query(
      `SELECT a.*, u.id AS patient_user_id, u.name AS patient_name, u.age, u.gender 
       FROM appointments a 
       JOIN users u ON a.patient_id = u.id 
       WHERE a.doctor_id = ? 
       ORDER BY a.appointment_date DESC`,
      [req.session.userId]
    );

    res.render('doctor/appointments', {
      activePage: 'appointments',
      appointments,
      message: msg
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/doctor/patients', requireRole('doctor'), async (req, res) => {
  const search = sanitize(req.query.search || '');
  try {
    let patients = [];
    if (search) {
      const [resList] = await db.query(
        `SELECT id, name, email, phone, age, gender FROM users 
         WHERE role = 'patient' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?) ORDER BY name`,
        [`%${search}%`, `%${search}%`, `%${search}%`]
      );
      patients = resList;
    } else {
      const [resList] = await db.query(
        "SELECT id, name, email, phone, age, gender FROM users WHERE role = 'patient' ORDER BY name"
      );
      patients = resList;
    }

    res.render('doctor/patients', {
      activePage: 'patients',
      patients,
      search
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/doctor/patient-history', requireRole('doctor'), async (req, res) => {
  const patient_id = parseInt(req.query.id) || 0;
  try {
    const [patientRes] = await db.query("SELECT * FROM users WHERE id = ? AND role = 'patient'", [patient_id]);
    if (patientRes.length === 0) {
      return res.redirect('/doctor/dashboard');
    }

    const [appointments] = await db.query(
      `SELECT a.*, u.name AS doctor_name, d.specialization 
       FROM appointments a 
       JOIN users u ON a.doctor_id = u.id 
       JOIN doctors d ON u.id = d.id 
       WHERE a.patient_id = ? 
       ORDER BY a.appointment_date DESC`,
      [patient_id]
    );

    const [vitals] = await db.query(
      "SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY logged_at DESC",
      [patient_id]
    );

    res.render('doctor/patient-history', {
      activePage: 'patient-history',
      patient: patientRes[0],
      appointments,
      vitals
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/doctor/messages', requireRole('doctor'), async (req, res) => {
  const selectedPatientId = parseInt(req.query.patient_id) || 0;
  try {
    const [patientsList] = await db.query(
      `SELECT DISTINCT u.id, u.name, u.gender 
       FROM users u
       JOIN messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
       WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.role = 'patient'
       ORDER BY u.name ASC`,
      [req.session.userId, req.session.userId]
    );

    if (selectedPatientId > 0) {
      await db.query(
        "UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE",
        [selectedPatientId, req.session.userId]
      );
    }

    let chatMessages = [];
    if (selectedPatientId > 0) {
      const [msgList] = await db.query(
        `SELECT * FROM messages 
         WHERE (sender_id = ? AND receiver_id = ?) 
            OR (sender_id = ? AND receiver_id = ?) 
         ORDER BY sent_at ASC`,
        [req.session.userId, selectedPatientId, selectedPatientId, req.session.userId]
      );
      chatMessages = msgList;
    }

    res.render('doctor/messages', {
      activePage: 'messages',
      patients: patientsList,
      selected_patient_id: selectedPatientId,
      chat_messages: chatMessages,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/doctor/messages', requireRole('doctor'), async (req, res) => {
  const patientId = parseInt(req.body.patient_id);
  const msgText = sanitize(req.body.message_text);

  try {
    if (patientId && msgText) {
      await db.query(
        "INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)",
        [req.session.userId, patientId, msgText]
      );
      res.redirect(`/doctor/messages?patient_id=${patientId}`);
    } else {
      res.redirect('/doctor/messages');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// -------------------------------------------------------------
// ADMIN VIEWS & CRUD MANAGEMENT
// -------------------------------------------------------------
app.get('/admin/dashboard', requireRole('admin'), async (req, res) => {
  try {
    const [patients] = await db.query("SELECT COUNT(*) AS count FROM users WHERE role='patient'");
    const [doctors] = await db.query("SELECT COUNT(*) AS count FROM users WHERE role='doctor'");
    const [appointments] = await db.query("SELECT COUNT(*) AS count FROM appointments");
    const [diseases] = await db.query("SELECT COUNT(*) AS count FROM diseases");

    res.render('admin/dashboard', {
      activePage: 'dashboard',
      stats: {
        patients: patients[0].count,
        doctors: doctors[0].count,
        appointments: appointments[0].count,
        diseases: diseases[0].count
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Manage Patients
app.get('/admin/manage-patients', requireRole('admin'), async (req, res) => {
  const msg = req.query.msg || null;
  const editId = parseInt(req.query.edit) || 0;
  try {
    let editPatient = null;
    if (editId > 0) {
      const [resList] = await db.query("SELECT * FROM users WHERE id = ? AND role = 'patient'", [editId]);
      editPatient = resList[0] || null;
    }

    const [patients] = await db.query("SELECT * FROM users WHERE role = 'patient' ORDER BY created_at DESC");

    res.render('admin/manage-patients', {
      activePage: 'manage-patients',
      patients,
      editPatient,
      message: msg
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/admin/manage-patients', requireRole('admin'), async (req, res) => {
  try {
    let msg = '';
    if (req.body.add_patient !== undefined) {
      const name = sanitize(req.body.name);
      const email = sanitize(req.body.email);
      const phone = sanitize(req.body.phone);
      const age = parseInt(req.body.age) || null;
      const gender = sanitize(req.body.gender);
      let rawPass = sanitize(req.body.password);
      if (!rawPass) rawPass = 'password123';

      const salt = bcrypt.genSaltSync(10);
      const password = bcrypt.hashSync(rawPass, salt);

      await db.query(
        "INSERT INTO users (name, email, password, phone, age, gender, role) VALUES (?, ?, ?, ?, ?, ?, 'patient')",
        [name, email, password, phone, age, gender]
      );
      msg = `Patient added successfully. Password: ${rawPass}`;
    } else if (req.body.update_patient !== undefined) {
      const id = parseInt(req.body.patient_id);
      const name = sanitize(req.body.name);
      const email = sanitize(req.body.email);
      const phone = sanitize(req.body.phone);
      const age = parseInt(req.body.age) || null;
      const gender = sanitize(req.body.gender);
      const rawPass = sanitize(req.body.password);

      if (rawPass) {
        const salt = bcrypt.genSaltSync(10);
        const password = bcrypt.hashSync(rawPass, salt);
        await db.query(
          "UPDATE users SET name = ?, email = ?, password = ?, phone = ?, age = ?, gender = ? WHERE id = ? AND role = 'patient'",
          [name, email, password, phone, age, gender, id]
        );
      } else {
        await db.query(
          "UPDATE users SET name = ?, email = ?, phone = ?, age = ?, gender = ? WHERE id = ? AND role = 'patient'",
          [name, email, phone, age, gender, id]
        );
      }
      msg = "Patient updated successfully.";
    } else if (req.body.delete_patient !== undefined) {
      const id = parseInt(req.body.patient_id);
      await db.query("DELETE FROM users WHERE id = ? AND role = 'patient'", [id]);
      msg = "Patient deleted successfully.";
    }

    res.redirect(`/admin/manage-patients?msg=${encodeURIComponent(msg)}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/manage-patients?msg=${encodeURIComponent('Database error occurred.')}`);
  }
});

// Manage Doctors
app.get('/admin/manage-doctors', requireRole('admin'), async (req, res) => {
  const msg = req.query.msg || null;
  const editId = parseInt(req.query.edit) || 0;
  try {
    let editDoctor = null;
    if (editId > 0) {
      const [resList] = await db.query(
        `SELECT u.id, u.name, u.email, d.specialization, d.experience, d.location 
         FROM users u JOIN doctors d ON u.id = d.id 
         WHERE u.id = ? AND u.role = 'doctor'`,
        [editId]
      );
      editDoctor = resList[0] || null;
    }

    const [doctors] = await db.query(
      `SELECT u.id, u.name, u.email, d.specialization, d.experience, d.location 
       FROM users u JOIN doctors d ON u.id = d.id 
       WHERE u.role = 'doctor' ORDER BY u.created_at DESC`
    );

    res.render('admin/manage-doctors', {
      activePage: 'manage-doctors',
      doctors,
      editDoctor,
      message: msg
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/admin/manage-doctors', requireRole('admin'), async (req, res) => {
  try {
    let msg = '';
    if (req.body.add_doctor !== undefined) {
      const name = sanitize(req.body.name);
      const email = sanitize(req.body.email);
      let rawPass = sanitize(req.body.password);
      if (!rawPass) rawPass = 'password123';
      const spec = sanitize(req.body.specialization);
      const exp = parseInt(req.body.experience) || 0;
      const loc = sanitize(req.body.location);

      const salt = bcrypt.genSaltSync(10);
      const password = bcrypt.hashSync(rawPass, salt);

      const [userRes] = await db.query(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'doctor')",
        [name, email, password]
      );
      const did = userRes.insertId;

      await db.query(
        "INSERT INTO doctors (id, specialization, experience, location) VALUES (?, ?, ?, ?)",
        [did, spec, exp, loc]
      );
      msg = `Doctor added successfully. Password: ${rawPass}`;

    } else if (req.body.update_doctor !== undefined) {
      const id = parseInt(req.body.doctor_id);
      const name = sanitize(req.body.name);
      const email = sanitize(req.body.email);
      const spec = sanitize(req.body.specialization);
      const exp = parseInt(req.body.experience) || 0;
      const loc = sanitize(req.body.location);
      const rawPass = sanitize(req.body.password);

      if (rawPass) {
        const salt = bcrypt.genSaltSync(10);
        const password = bcrypt.hashSync(rawPass, salt);
        await db.query("UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?", [name, email, password, id]);
      } else {
        await db.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, id]);
      }

      await db.query(
        "UPDATE doctors SET specialization = ?, experience = ?, location = ? WHERE id = ?",
        [spec, exp, loc, id]
      );
      msg = "Doctor updated successfully.";

    } else if (req.body.delete_doctor !== undefined) {
      const id = parseInt(req.body.doctor_id);
      await db.query("DELETE FROM users WHERE id = ?", [id]);
      msg = "Doctor deleted successfully.";
    }

    res.redirect(`/admin/manage-doctors?msg=${encodeURIComponent(msg)}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/manage-doctors?msg=${encodeURIComponent('Database error occurred.')}`);
  }
});

// Manage Symptoms
app.get('/admin/manage-symptoms', requireRole('admin'), async (req, res) => {
  const msg = req.query.msg || null;
  const editId = parseInt(req.query.edit) || 0;
  try {
    let editSymptom = null;
    if (editId > 0) {
      const [resList] = await db.query("SELECT * FROM symptoms WHERE symptom_id = ?", [editId]);
      editSymptom = resList[0] || null;
    }
    const [symptoms] = await db.query("SELECT * FROM symptoms ORDER BY name ASC");

    res.render('admin/manage-symptoms', {
      activePage: 'manage-symptoms',
      symptoms,
      editSymptom,
      message: msg
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/admin/manage-symptoms', requireRole('admin'), async (req, res) => {
  try {
    let msg = '';
    if (req.body.add_symptom !== undefined) {
      const name = sanitize(req.body.name);
      const desc = sanitize(req.body.description);
      await db.query("INSERT INTO symptoms (name, description) VALUES (?, ?)", [name, desc]);
      msg = "Symptom added successfully.";
    } else if (req.body.update_symptom !== undefined) {
      const id = parseInt(req.body.symptom_id);
      const name = sanitize(req.body.name);
      const desc = sanitize(req.body.description);
      await db.query("UPDATE symptoms SET name = ?, description = ? WHERE symptom_id = ?", [name, desc, id]);
      msg = "Symptom updated successfully.";
    } else if (req.body.delete_symptom !== undefined) {
      const id = parseInt(req.body.symptom_id);
      await db.query("DELETE FROM symptoms WHERE symptom_id = ?", [id]);
      msg = "Symptom deleted successfully.";
    }

    res.redirect(`/admin/manage-symptoms?msg=${encodeURIComponent(msg)}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/manage-symptoms?msg=${encodeURIComponent('Database error occurred.')}`);
  }
});

// Manage Diseases
app.get('/admin/manage-diseases', requireRole('admin'), async (req, res) => {
  const msg = req.query.msg || null;
  const editId = parseInt(req.query.edit) || 0;
  try {
    let editDisease = null;
    if (editId > 0) {
      const [resList] = await db.query("SELECT * FROM diseases WHERE disease_id = ?", [editId]);
      editDisease = resList[0] || null;
    }
    const [diseases] = await db.query("SELECT * FROM diseases ORDER BY name ASC");

    res.render('admin/manage-diseases', {
      activePage: 'manage-diseases',
      diseases,
      editDisease,
      message: msg
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/admin/manage-diseases', requireRole('admin'), async (req, res) => {
  try {
    let msg = '';
    if (req.body.add_disease !== undefined) {
      const name = sanitize(req.body.name);
      const severity = sanitize(req.body.severity);
      const desc = sanitize(req.body.description);
      await db.query("INSERT INTO diseases (name, severity, description) VALUES (?, ?, ?)", [name, severity, desc]);
      msg = "Disease added successfully.";
    } else if (req.body.update_disease !== undefined) {
      const id = parseInt(req.body.disease_id);
      const name = sanitize(req.body.name);
      const severity = sanitize(req.body.severity);
      const desc = sanitize(req.body.description);
      await db.query("UPDATE diseases SET name = ?, severity = ?, description = ? WHERE disease_id = ?", [name, severity, desc, id]);
      msg = "Disease updated successfully.";
    } else if (req.body.delete_disease !== undefined) {
      const id = parseInt(req.body.disease_id);
      await db.query("DELETE FROM diseases WHERE disease_id = ?", [id]);
      msg = "Disease deleted successfully.";
    }

    res.redirect(`/admin/manage-diseases?msg=${encodeURIComponent(msg)}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/manage-diseases?msg=${encodeURIComponent('Database error occurred.')}`);
  }
});

// Manage Medicines
app.get('/admin/manage-medicines', requireRole('admin'), async (req, res) => {
  const msg = req.query.msg || null;
  const editId = parseInt(req.query.edit) || 0;
  try {
    let editMedicine = null;
    if (editId > 0) {
      const [resList] = await db.query("SELECT * FROM medicines WHERE medicine_id = ?", [editId]);
      editMedicine = resList[0] || null;
    }
    const [medicines] = await db.query("SELECT * FROM medicines ORDER BY name ASC");

    res.render('admin/manage-medicines', {
      activePage: 'manage-medicines',
      medicines,
      editMedicine,
      message: msg
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/admin/manage-medicines', requireRole('admin'), async (req, res) => {
  try {
    let msg = '';
    if (req.body.add_medicine !== undefined) {
      const name = sanitize(req.body.name);
      const dosage = sanitize(req.body.dosage);
      const type = sanitize(req.body.type);
      await db.query("INSERT INTO medicines (name, dosage, type) VALUES (?, ?, ?)", [name, dosage, type]);
      msg = "Medicine added successfully.";
    } else if (req.body.update_medicine !== undefined) {
      const id = parseInt(req.body.medicine_id);
      const name = sanitize(req.body.name);
      const dosage = sanitize(req.body.dosage);
      const type = sanitize(req.body.type);
      await db.query("UPDATE medicines SET name = ?, dosage = ?, type = ? WHERE medicine_id = ?", [name, dosage, type, id]);
      msg = "Medicine updated successfully.";
    } else if (req.body.delete_medicine !== undefined) {
      const id = parseInt(req.body.medicine_id);
      await db.query("DELETE FROM medicines WHERE medicine_id = ?", [id]);
      msg = "Medicine deleted successfully.";
    }

    res.redirect(`/admin/manage-medicines?msg=${encodeURIComponent(msg)}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/manage-medicines?msg=${encodeURIComponent('Database error occurred.')}`);
  }
});

// Manage Advice
app.get('/admin/manage-advice', requireRole('admin'), async (req, res) => {
  const msg = req.query.msg || null;
  const editId = parseInt(req.query.edit) || 0;
  try {
    let editAdvice = null;
    if (editId > 0) {
      const [resList] = await db.query("SELECT * FROM advice WHERE advice_id = ?", [editId]);
      editAdvice = resList[0] || null;
    }
    const [advice] = await db.query("SELECT * FROM advice ORDER BY advice_id DESC");

    res.render('admin/manage-advice', {
      activePage: 'manage-advice',
      advice,
      editAdvice,
      message: msg
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/admin/manage-advice', requireRole('admin'), async (req, res) => {
  try {
    let msg = '';
    if (req.body.add_advice !== undefined) {
      const rec = sanitize(req.body.recommendation);
      await db.query("INSERT INTO advice (recommendation) VALUES (?)", [rec]);
      msg = "Advice added successfully.";
    } else if (req.body.update_advice !== undefined) {
      const id = parseInt(req.body.advice_id);
      const rec = sanitize(req.body.recommendation);
      await db.query("UPDATE advice SET recommendation = ? WHERE advice_id = ?", [rec, id]);
      msg = "Advice updated successfully.";
    } else if (req.body.delete_advice !== undefined) {
      const id = parseInt(req.body.advice_id);
      await db.query("DELETE FROM advice WHERE advice_id = ?", [id]);
      msg = "Advice deleted successfully.";
    }

    res.redirect(`/admin/manage-advice?msg=${encodeURIComponent(msg)}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/manage-advice?msg=${encodeURIComponent('Database error occurred.')}`);
  }
});

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------
app.get('/api/get-symptoms', async (req, res) => {
  try {
    const [symptoms] = await db.query("SELECT symptom_id, name FROM symptoms ORDER BY name ASC");
    res.json({ success: true, data: symptoms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.get('/api/search-doctors', async (req, res) => {
  const q = sanitize(req.query.q || '');
  try {
    const [doctors] = await db.query(
      `SELECT u.id, u.name, d.specialization, d.location 
       FROM users u 
       JOIN doctors d ON u.id = d.id 
       WHERE u.role = 'doctor' AND (u.name LIKE ? OR d.specialization LIKE ?)`,
      [`%${q}%`, `%${q}%`]
    );
    res.json({ success: true, data: doctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/check-symptoms', async (req, res) => {
  const symptomIds = req.body.symptoms;
  if (!symptomIds || !Array.isArray(symptomIds) || symptomIds.length === 0) {
    return res.json({ success: false, message: 'No symptoms provided' });
  }

  try {
    const cleanIds = symptomIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (cleanIds.length === 0) {
      return res.json({ success: false, message: 'Invalid symptoms' });
    }

    const inClause = cleanIds.join(',');
    const sql = `
      SELECT d.disease_id, d.name, d.description, COUNT(ds.symptom_id) as match_count
      FROM diseases d
      JOIN disease_symptoms ds ON d.disease_id = ds.disease_id
      WHERE ds.symptom_id IN (${inClause})
      GROUP BY d.disease_id, d.name, d.description
      ORDER BY match_count DESC
    `;

    const [diseases] = await db.query(sql);

    for (let d of diseases) {
      const [meds] = await db.query(
        "SELECT m.name FROM medicines m JOIN disease_medicines dm ON m.medicine_id = dm.medicine_id WHERE dm.disease_id = ?",
        [d.disease_id]
      );
      d.medicines = meds.map(m => m.name);

      const [advices] = await db.query(
        "SELECT a.recommendation FROM advice a JOIN disease_advice da ON a.advice_id = da.advice_id WHERE da.disease_id = ?",
        [d.disease_id]
      );
      d.advices = advices.map(a => a.recommendation);
    }

    res.json({ success: true, data: diseases });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`MedAssist Node.js server running on http://localhost:${PORT}`);
});
