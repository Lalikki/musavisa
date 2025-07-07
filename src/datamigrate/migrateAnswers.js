// migrateAnswers.js
const admin = require('firebase-admin');

// ---- IMPORTANT: CONFIGURE YOUR SERVICE ACCOUNT KEY PATH ----
// Replace './path/to/your-service-account-key.json' with the actual path to your downloaded service account key
const serviceAccount = require('./firebase_admin.json'); // e.g., './musavisa-firebase-adminsdk.json'

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateQuizAnswers() {
    console.log('Starting migration of quizAnswers...');

    const quizAnswersRef = db.collection('quizAnswers');
    const quizzesRef = db.collection('quizzes');
    let updatedCount = 0;
    let processedCount = 0;

    try {
        const snapshot = await quizAnswersRef.get();

        if (snapshot.empty) {
            console.log('No quizAnswers documents found.');
            return;
        }

        console.log(`Found ${snapshot.docs.length} quizAnswers documents to process.`);

        for (const answerDoc of snapshot.docs) {
            processedCount++;
            const answerData = answerDoc.data();
            const answerId = answerDoc.id;

            // Check if calculatedMaxScore is already present and valid
            if (answerData.calculatedMaxScore !== undefined && answerData.calculatedMaxScore !== null) {
                // console.log(`Answer ${answerId} already has calculatedMaxScore: ${answerData.calculatedMaxScore}. Skipping.`);
                continue;
            }

            if (!answerData.quizId) {
                console.warn(`Answer ${answerId} is missing quizId. Skipping.`);
                continue;
            }

            console.log(`Processing answer ${answerId} for quizId ${answerData.quizId}...`);

            try {
                const quizDoc = await quizzesRef.doc(answerData.quizId).get();

                if (quizDoc.exists) {
                    const quizData = quizDoc.data();
                    if (quizData.calculatedMaxScore !== undefined && quizData.calculatedMaxScore !== null) {
                        await answerDoc.ref.update({
                            calculatedMaxScore: quizData.calculatedMaxScore
                        });
                        console.log(`  SUCCESS: Updated answer ${answerId} with calculatedMaxScore: ${quizData.calculatedMaxScore}`);
                        updatedCount++;
                    } else {
                        console.warn(`  WARNING: Quiz ${answerData.quizId} for answer ${answerId} is missing calculatedMaxScore. Skipping update for this answer.`);
                    }
                } else {
                    console.warn(`  WARNING: Quiz ${answerData.quizId} not found for answer ${answerId}. Skipping update for this answer.`);
                }
            } catch (quizError) {
                console.error(`  ERROR fetching quiz ${answerData.quizId} or updating answer ${answerId}:`, quizError);
            }
        }

        console.log('--------------------------------------------------');
        console.log('Migration finished.');
        console.log(`Total quizAnswers documents processed: ${processedCount}`);
        console.log(`Total quizAnswers documents updated: ${updatedCount}`);
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('Error fetching quizAnswers collection:', error);
    }
}

migrateQuizAnswers().then(() => {
    console.log('Script execution completed.');
    // You might want to explicitly exit the process if it doesn't terminate automatically
    // process.exit(0);
}).catch(err => {
    console.error('Unhandled error in script:', err);
    // process.exit(1);
});
