import streamlit as st
import pandas as pd
import numpy as np
import joblib
import os

# Page Configuration
st.set_page_config(
    page_title="Diabetes Risk Assessment",
    layout="centered",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
    .stApp {
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: white; 
    }
    p, label, span, div {
        color: white !important;
    }
    h1, h2, h3 {
        color: #00d2ff !important; 
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        text-align: center;
    }
    .stButton {
        display: flex;
        justify-content: center;
    }
    .stButton>button {
        width: auto;
        min-width: 200px;
        border-radius: 30px;
        background: linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%);
        color: white !important;
        font-weight: bold;
        font-size: 18px;
        border: none;
        padding: 0.8rem 2rem;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .stButton>button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        background: linear-gradient(90deg, #3a7bd5 0%, #00d2ff 100%);
    }
    .stNumberInput > div > div > input {
        background-color: rgba(255, 255, 255, 0.1);
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        caret-color: white;
    }
    .calculated-box {
        background-color: rgba(255, 255, 255, 0.1);
        border: 2px solid #00d2ff;
        border-radius: 10px;
        padding: 1.5rem;
        text-align: center;
        margin-top: 1rem;
        margin-bottom: 1rem;
    }
    .stProgress > div > div > div > div {
        background-color: #00d2ff;
        background-image: linear-gradient(90deg, #00d2ff 0%, #928DAB 100%);
    }
    </style>
    """, unsafe_allow_html=True)

# Load model and scaler
@st.cache_resource
def load_model():
    model_path = 'model/diabetes_model.pkl'
    scaler_path = 'model/scaler.pkl'
    
    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        return None, None
        
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    return model, scaler

model, scaler = load_model()

# Session State Management
if 'step' not in st.session_state:
    st.session_state.step = 1
if 'inputs' not in st.session_state:
    st.session_state.inputs = {}

def next_step():
    st.session_state.step += 1

def prev_step():
    st.session_state.step -= 1

def restart():
    st.session_state.step = 1
    st.session_state.inputs = {}

# Step 1: Welcome
if st.session_state.step == 1:
    st.markdown("<h1>🩺 Diabetes Risk Assessment</h1>", unsafe_allow_html=True)
    st.markdown("<div style='text-align: center; font-size: 100px; margin-bottom: 20px;'>💙</div>", unsafe_allow_html=True)
    st.markdown("<h3 style='text-align: center;'>Welcome to your health journey</h3>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; font-size: 18px;'>This tool uses advanced AI to assess your risk of developing diabetes.<br>It takes just <strong>2 minutes</strong>.</p>", unsafe_allow_html=True)
    
    st.write("") 
    st.write("") 
    
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        if st.button("Start Assessment ➡️"):
            next_step()

# Step 2: Basic Information
elif st.session_state.step == 2:
    st.markdown("## Step 1 of 4: Basic Information")
    st.progress(25)
    
    with st.container():
        st.write("Let's start with some basics.")
        
        age = st.number_input("What is your Age?", min_value=1, max_value=120, value=st.session_state.inputs.get('age', 25))
        pregnancies = st.number_input("Number of Pregnancies (0 if not applicable)", min_value=0, max_value=20, value=st.session_state.inputs.get('pregnancies', 0))
        
        st.session_state.inputs['age'] = age
        st.session_state.inputs['pregnancies'] = pregnancies
        
        col1, col2 = st.columns(2)
        with col1:
            st.button("⬅️ Back", on_click=prev_step)
        with col2:
            st.button("Next ➡️", on_click=next_step)

# Step 3: Body Metrics
elif st.session_state.step == 3:
    st.markdown("## Step 2 of 4: Body Metrics")
    st.progress(50)
    
    with st.container():
        st.write("We need your height and weight to calculate your BMI (Body Mass Index).")
        
        col1, col2 = st.columns(2)
        with col1:
            height = st.number_input("Height (cm)", min_value=50.0, max_value=250.0, value=st.session_state.inputs.get('height', 170.0))
        with col2:
            weight = st.number_input("Weight (kg)", min_value=20.0, max_value=300.0, value=st.session_state.inputs.get('weight', 70.0))
            
        # BMI Calculation
        bmi_val = weight / ((height/100) ** 2)
        
        st.markdown(f"""
        <div class="calculated-box">
            <h3 style="margin:0; color: #00d2ff !important;">BMI: {bmi_val:.1f}</h3>
            <p style="margin:0;">Body Mass Index</p>
        </div>
        """, unsafe_allow_html=True)
        
        st.session_state.inputs['height'] = height
        st.session_state.inputs['weight'] = weight
        st.session_state.inputs['bmi'] = bmi_val
        
        col1, col2 = st.columns(2)
        with col1:
            st.button("⬅️ Back", on_click=prev_step)
        with col2:
            st.button("Next ➡️", on_click=next_step)

# Step 4: Clinical Indicators
elif st.session_state.step == 4:
    st.markdown("## Step 3 of 4: Clinical Indicators")
    st.progress(75)
    
    with st.container():
        st.write("Please enter your latest health readings.")
        
        glucose = st.number_input("Glucose Level (mg/dL)", min_value=0.0, max_value=500.0, value=st.session_state.inputs.get('glucose', 100.0))
        bp = st.number_input("Blood Pressure (mm/Hg)", min_value=0.0, max_value=200.0, value=st.session_state.inputs.get('bp', 72.0))
        skin = st.number_input("Skin Thickness (mm)", min_value=0.0, max_value=100.0, value=st.session_state.inputs.get('skin', 20.0))
        insulin = st.number_input("Insulin Level (mu U/ml)", min_value=0.0, max_value=900.0, value=st.session_state.inputs.get('insulin', 79.0))
        dpf = st.number_input("Diabetes Pedigree Function", min_value=0.0, max_value=3.0, value=st.session_state.inputs.get('dpf', 0.47))
        
        st.session_state.inputs['glucose'] = glucose
        st.session_state.inputs['bp'] = bp
        st.session_state.inputs['skin'] = skin
        st.session_state.inputs['insulin'] = insulin
        st.session_state.inputs['dpf'] = dpf
        
        col1, col2 = st.columns(2)
        with col1:
            st.button("⬅️ Back", on_click=prev_step)
        with col2:
            st.button("Analyze Risk 🔍", on_click=next_step)

# Step 5: Result
elif st.session_state.step == 5:
    st.markdown("## Assessment Result")
    st.progress(100)
    
    if model is None:
        st.error("Model file not found. Please train the model first.")
    else:
        # Prediction
        inputs = st.session_state.inputs
        features = np.array([[
            inputs['pregnancies'],
            inputs['glucose'],
            inputs['bp'],
            inputs['skin'],
            inputs['insulin'],
            inputs['bmi'],
            inputs['dpf'],
            inputs['age']
        ]])
        
        scaled_features = scaler.transform(features)
        
        prediction = model.predict(scaled_features)
        probability = model.predict_proba(scaled_features)[0][1]
        
        st.divider()
        
        if prediction[0] == 1:
            st.error("### ⚠️ High Risk Detected")
            st.markdown(f"**Probability:** {probability:.1%}")
            st.write("Based on the provided data, there is a high indication of diabetes risk.")
            st.warning("Please consult a healthcare professional for a comprehensive diagnosis.")
        else:
            st.success("### ✅ Low Risk Detected")
            st.markdown(f"**Probability:** {probability:.1%}")
            st.write("Your metrics suggest a low risk of diabetes at this time.")
            st.balloons()
            
        st.divider()
        st.write("Note: This is an AI-powered screening tool and is not a substitute for professional medical advice.")
        
        if st.button("Start Over 🔄"):
            restart()
