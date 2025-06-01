// migrateAnswers.js
const admin = require('firebase-admin');

// ---- IMPORTANT: CONFIGURE YOUR SERVICE ACCOUNT KEY PATH ----
// Replace './path/to/your-service-account-key.json' with the actual path to your downloaded service account key
const serviceAccount = require('./firebase_admin.json'); // e.g., './musavisa-firebase-adminsdk.json'

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateQuizzes() {
    console.log('Starting migration of quizzes to add calculatedMaxScore...');
    const quizzesRef = db.collection('quizzes');
    let quizzesUpdatedCount = 0;
    let quizzesProcessedCount = 0;

    try {
        const snapshot = await quizzesRef.get();
        if (snapshot.empty) {
            console.log('No quiz documents found.');
            return;
        }

        console.log(`Found ${snapshot.docs.length} quiz documents to process for calculatedMaxScore.`);

        for (const quizDoc of snapshot.docs) {
            quizzesProcessedCount++;
            const quizData = quizDoc.data();
            const quizId = quizDoc.id;
            let calculatedMaxScore = 0;

            if (quizData.questions && Array.isArray(quizData.questions)) {
                quizData.questions.forEach(q => {
                    calculatedMaxScore += 0.5; // For artist
                    calculatedMaxScore += 0.5; // For song
                    if (q.extra && q.extra.trim() !== '' && q.correctExtraAnswer && q.correctExtraAnswer.trim() !== '') {
                        calculatedMaxScore += 0.5; // For extra question
                    }
                });
            }

            // Update only if the calculated score is different or missing
            if (quizData.calculatedMaxScore !== calculatedMaxScore) {
                await quizDoc.ref.update({ calculatedMaxScore });
                console.log(`  SUCCESS: Updated quiz ${quizId} with new calculatedMaxScore: ${calculatedMaxScore} (was ${quizData.calculatedMaxScore})`);
                quizzesUpdatedCount++;
            }
        }
        console.log(`Quiz migration finished. Processed: ${quizzesProcessedCount}, Updated: ${quizzesUpdatedCount}`);
    } catch (error) {
        console.error('Error during quiz migration:', error);
    }
}

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

async function runAllMigrations() {
    await migrateQuizzes(); // First, ensure all quizzes have calculatedMaxScore
    console.log('\nProceeding to migrate quizAnswers...\n');
    await migrateQuizAnswers(); // Then, migrate the answers
}

runAllMigrations().then(() => {
    console.log('All migration scripts execution completed.');
    // You might want to explicitly exit the process if it doesn't terminate automatically
    // process.exit(0);
}).catch(err => {
    console.error('Unhandled error in main script execution:', err);
    // process.exit(1);
});
