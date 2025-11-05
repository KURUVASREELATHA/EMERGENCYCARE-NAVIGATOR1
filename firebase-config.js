// Firebase Configuration and Firestore Integration
// This file contains the Firebase setup and Firestore security rules

// Firebase Configuration (Replace with your actual config)
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "emergency-medical-system.firebaseapp.com",
    projectId: "emergency-medical-system",
    storageBucket: "emergency-medical-system.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id-here"
};

// Initialize Firebase (Uncomment when ready to use)
/*
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
*/

// Firestore Collections Structure
const COLLECTIONS = {
    HOSPITALS: 'hospitals',
    HOSPITAL_REQUESTS: 'hospital_requests',
    AVAILABILITY_LOGS: 'availability_logs',
    AI_RECOMMENDATION_LOGS: 'ai_recommendation_logs',
    EMERGENCY_NOTIFICATIONS: 'emergency_notifications',
    USERS: 'users'
};

// Sample Firestore Security Rules
const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Hospitals collection - read-only for users, write for approved hospitals
    match /hospitals/{hospitalId} {
      allow read: if true; // Public read access for emergency services
      allow write: if request.auth != null && 
                   (resource.data.hospital_admin_uid == request.auth.uid ||
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      
      // Only allow availability updates for hospital staff
      allow update: if request.auth != null && 
                    resource.data.hospital_admin_uid == request.auth.uid &&
                    // Only these fields can be updated by hospital staff
                    request.resource.data.diff(resource.data).affectedKeys()
                    .hasOnly(['beds_available', 'doctors_available', 'accepts_emergency', 'last_updated']);
    }
    
    // Hospital requests - only admins can approve/reject
    match /hospital_requests/{requestId} {
      allow read: if request.auth != null && 
                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if request.auth != null; // Anyone can submit a request
      allow update, delete: if request.auth != null && 
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // AI recommendation logs - system only
    match /ai_recommendation_logs/{logId} {
      allow read: if request.auth != null && 
                  (resource.data.user_uid == request.auth.uid ||
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null;
    }
    
    // Availability logs - hospital staff and admins
    match /availability_logs/{logId} {
      allow read: if request.auth != null && 
                  (resource.data.hospital_admin_uid == request.auth.uid ||
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null;
    }
    
    // Emergency notifications - hospitals and users involved
    match /emergency_notifications/{notificationId} {
      allow read, create: if request.auth != null;
      allow update: if request.auth != null && 
                    (resource.data.hospital_admin_uid == request.auth.uid ||
                     resource.data.user_uid == request.auth.uid);
    }
  }
}
`;

// Firestore Helper Functions
class FirestoreService {
    
    // Hospital Management
    static async createHospitalRequest(hospitalData) {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.HOSPITAL_REQUESTS), {
                ...hospitalData,
                status: 'pending',
                created_at: new Date().toISOString(),
                created_by: auth.currentUser?.uid
            });
            console.log('Hospital request created:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error creating hospital request:', error);
            throw error;
        }
    }
    
    static async approveHospitalRequest(requestId, hospitalData) {
        try {
            // Move from requests to hospitals collection
            await addDoc(collection(db, COLLECTIONS.HOSPITALS), {
                ...hospitalData,
                approved_at: new Date().toISOString(),
                approved_by: auth.currentUser?.uid,
                status: 'active'
            });
            
            // Update request status
            await updateDoc(doc(db, COLLECTIONS.HOSPITAL_REQUESTS, requestId), {
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: auth.currentUser?.uid
            });
            
            console.log('Hospital approved and added to system');
        } catch (error) {
            console.error('Error approving hospital:', error);
            throw error;
        }
    }
    
    static async updateHospitalAvailability(hospitalId, availabilityData) {
        try {
            await updateDoc(doc(db, COLLECTIONS.HOSPITALS, hospitalId), {
                ...availabilityData,
                last_updated: new Date().toISOString(),
                updated_by: auth.currentUser?.uid
            });
            
            // Log the availability update
            await addDoc(collection(db, COLLECTIONS.AVAILABILITY_LOGS), {
                hospital_id: hospitalId,
                availability_data: availabilityData,
                timestamp: new Date().toISOString(),
                updated_by: auth.currentUser?.uid
            });
            
            console.log('Hospital availability updated');
        } catch (error) {
            console.error('Error updating availability:', error);
            throw error;
        }
    }
    
    // AI Recommendation Logging
    static async logAIRecommendation(recommendationData) {
        try {
            await addDoc(collection(db, COLLECTIONS.AI_RECOMMENDATION_LOGS), {
                ...recommendationData,
                timestamp: new Date().toISOString(),
                user_uid: auth.currentUser?.uid
            });
            console.log('AI recommendation logged');
        } catch (error) {
            console.error('Error logging AI recommendation:', error);
            throw error;
        }
    }
    
    // Emergency Notifications
    static async createEmergencyNotification(notificationData) {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.EMERGENCY_NOTIFICATIONS), {
                ...notificationData,
                status: 'sent',
                timestamp: new Date().toISOString(),
                user_uid: auth.currentUser?.uid
            });
            console.log('Emergency notification created:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error creating emergency notification:', error);
            throw error;
        }
    }
    
    // District-based Hospital Queries
    static async getHospitalsByDistrict(district) {
        try {
            const q = query(
                collection(db, COLLECTIONS.HOSPITALS),
                where('district', '==', district),
                where('status', '==', 'active')
            );
            const querySnapshot = await getDocs(q);
            const hospitals = [];
            querySnapshot.forEach((doc) => {
                hospitals.push({ id: doc.id, ...doc.data() });
            });
            return hospitals;
        } catch (error) {
            console.error('Error fetching hospitals:', error);
            throw error;
        }
    }
    
    // Authentication
    static async loginUser(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
    
    static async registerUser(email, password, userData) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Add user data to Firestore
            await addDoc(collection(db, COLLECTIONS.USERS), {
                uid: userCredential.user.uid,
                email: email,
                ...userData,
                created_at: new Date().toISOString()
            });
            
            return userCredential.user;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }
}

// Cloud Functions for AI Integration (Deploy to Firebase Functions)
const CLOUD_FUNCTIONS = {
    
    // AI Emergency Triage Function
    aiEmergencyTriage: `
    const functions = require('firebase-functions');
    const admin = require('firebase-admin');
    const { OpenAI } = require('openai');
    
    const openai = new OpenAI({
        apiKey: functions.config().openai.key
    });
    
    exports.aiEmergencyTriage = functions.https.onCall(async (data, context) => {
        try {
            const { transcript, userLocation, district } = data;
            
            // Call OpenAI for emergency analysis
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: "You are an emergency medical AI. Analyze the user's description and provide: severity (low/medium/high/critical), category (cardiac/respiratory/trauma/general), and confidence score (0-1)."
                }, {
                    role: "user",
                    content: transcript
                }],
                max_tokens: 200
            });
            
            const aiResponse = JSON.parse(completion.choices[0].message.content);
            
            // Get recommended hospitals from Firestore
            const hospitalsSnapshot = await admin.firestore()
                .collection('hospitals')
                .where('district', '==', district)
                .where('accepts_emergency', '==', true)
                .where('beds_available', '>', 0)
                .get();
            
            const hospitals = [];
            hospitalsSnapshot.forEach(doc => {
                hospitals.push({ id: doc.id, ...doc.data() });
            });
            
            // Calculate hospital scores and sort
            const scoredHospitals = hospitals.map(hospital => ({
                ...hospital,
                score: calculateHospitalScore(hospital, aiResponse.severity, userLocation)
            })).sort((a, b) => b.score - a.score);
            
            const result = {
                ...aiResponse,
                recommendedHospitals: scoredHospitals.slice(0, 3),
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            };
            
            // Log the AI recommendation
            await admin.firestore().collection('ai_recommendation_logs').add({
                user_uid: context.auth?.uid,
                transcript,
                analysis: result,
                location: userLocation,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return result;
            
        } catch (error) {
            console.error('AI Triage Error:', error);
            throw new functions.https.HttpsError('internal', 'AI analysis failed');
        }
    });
    
    function calculateHospitalScore(hospital, severity, userLocation) {
        let score = 0;
        
        // Availability scoring
        if (hospital.status === 'available') score += 50;
        else if (hospital.status === 'busy') score += 25;
        
        score += Math.min(hospital.beds_available * 2, 30);
        
        if (hospital.doctors_available) score += 20;
        
        // Distance calculation (simplified)
        if (userLocation) {
            const distance = calculateDistance(
                userLocation.lat, userLocation.lng,
                hospital.lat, hospital.lng
            );
            score += Math.max(20 - distance, 0);
        }
        
        return score;
    }
    `,
    
    // Hospital Notification Function
    hospitalNotification: `
    const functions = require('firebase-functions');
    const admin = require('firebase-admin');
    const twilio = require('twilio');
    
    const client = twilio(
        functions.config().twilio.sid,
        functions.config().twilio.token
    );
    
    exports.notifyHospital = functions.https.onCall(async (data, context) => {
        try {
            const { hospitalId, emergencyData, userContact } = data;
            
            // Get hospital details
            const hospitalDoc = await admin.firestore()
                .collection('hospitals')
                .doc(hospitalId)
                .get();
            
            if (!hospitalDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Hospital not found');
            }
            
            const hospital = hospitalDoc.data();
            
            // Send SMS notification to hospital
            const message = await client.messages.create({
                body: \`🚨 EMERGENCY ALERT
                
Patient incoming with: \${emergencyData.category}
Severity: \${emergencyData.severity}
ETA: \${emergencyData.eta} minutes
Contact: \${userContact}
                
Please confirm receipt.\`,
                from: functions.config().twilio.phone,
                to: hospital.emergency_contact
            });
            
            // Log notification
            await admin.firestore().collection('emergency_notifications').add({
                hospital_id: hospitalId,
                user_uid: context.auth?.uid,
                message_sid: message.sid,
                emergency_data: emergencyData,
                status: 'sent',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return { success: true, messageId: message.sid };
            
        } catch (error) {
            console.error('Notification Error:', error);
            throw new functions.https.HttpsError('internal', 'Notification failed');
        }
    });
    `
};

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        firebaseConfig,
        COLLECTIONS,
        FIRESTORE_RULES,
        FirestoreService,
        CLOUD_FUNCTIONS
    };
}