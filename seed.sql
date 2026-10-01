USE med_assist;

-- Insert some basic symptoms
INSERT IGNORE INTO symptoms (symptom_id, name) VALUES
(1, 'Fever'),
(2, 'Cough'),
(3, 'Headache'),
(4, 'Nausea'),
(5, 'Vomiting'),
(6, 'Fatigue'),
(7, 'Chest Pain'),
(8, 'Shortness of Breath'),
(9, 'Abdominal Pain'),
(10, 'Diarrhea'),
(11, 'Skin Rash'),
(12, 'Joint Pain'),
(13, 'Runny Nose'),
(14, 'Sore Throat'),
(15, 'Dizziness'),
(16, 'Frequent Urination'),
(17, 'Painful urination');

-- Insert some basic diseases
INSERT IGNORE INTO diseases (disease_id, name, severity, description) VALUES
(1, 'Common Cold', 'Mild', 'A common viral infection of the nose and throat.'),
(2, 'Flu', 'Moderate', 'A viral infection that attacks your respiratory system.'),
(3, 'Food Poisoning', 'Moderate', 'Illness caused by eating contaminated food.'),
(4, 'COVID-19', 'Severe', 'A highly contagious respiratory disease caused by the SARS-CoV-2 virus.'),
(5, 'Migraine', 'Moderate', 'A headache of varying intensity, often accompanied by nausea and sensitivity to light and sound.'),
(6, 'Urinary Tract Infection', 'Moderate', 'An infection in any part of your urinary system.'),
(7, 'Gastroenteritis', 'Moderate', 'Intestinal infection marked by diarrhea, cramps, nausea, vomiting, and fever.');

-- Map symptoms to diseases
INSERT IGNORE INTO disease_symptoms (disease_id, symptom_id) VALUES
(1, 2), (1, 13), (1, 14), -- Common Cold: Cough, Runny Nose, Sore Throat
(2, 1), (2, 2), (2, 6), -- Flu: Fever, Cough, Fatigue
(3, 4), (3, 5), (3, 9), (3, 10), -- Food Poisoning: Nausea, Vomiting, Abdominal Pain, Diarrhea
(4, 1), (4, 2), (4, 6), (4, 8), -- COVID-19: Fever, Cough, Fatigue, Shortness of Breath
(5, 3), (5, 4), (5, 15), -- Migraine: Headache, Nausea, Dizziness
(6, 16), (6, 17), -- UTI: Frequent Urination, Painful urination
(7, 4), (7, 5), (7, 9), (7, 10), (7, 1); -- Gastroenteritis: Nausea, Vomiting, Abdominal Pain, Diarrhea, Fever

-- Insert some medicines
INSERT IGNORE INTO medicines (medicine_id, name, dosage) VALUES
(1, 'Paracetamol', '500mg as needed'),
(2, 'Ibuprofen', '400mg twice a day'),
(3, 'Cough Syrup', '10ml three times a day'),
(4, 'Oral Rehydration Salts (ORS)', '1 sachet in 1 liter of water'),
(5, 'Antibiotics', 'As prescribed by doctor');

-- Map medicines to diseases
INSERT IGNORE INTO disease_medicines (disease_id, medicine_id) VALUES
(1, 3),
(2, 1),
(3, 4),
(5, 2),
(6, 5),
(7, 4);

-- Insert some advice
INSERT IGNORE INTO advice (advice_id, recommendation) VALUES
(1, 'Get plenty of rest and drink lots of fluids.'),
(2, 'Avoid spicy and oily foods.'),
(3, 'Consult a doctor immediately if symptoms worsen.'),
(4, 'Maintain good hygiene and wash hands frequently.');

-- Map advice to diseases
INSERT IGNORE INTO disease_advice (disease_id, advice_id) VALUES
(1, 1),
(2, 1), (2, 3),
(3, 1), (3, 2),
(4, 1), (4, 3),
(5, 1),
(6, 1), (6, 3),
(7, 1), (7, 2);
