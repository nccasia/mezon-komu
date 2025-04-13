import { Inject, Injectable } from '@nestjs/common';
import { app } from 'firebase-admin';
import { FStore_Transaction } from '../entities/transaction.firestore-entity';

@Injectable()
export class FStore_TransactionRepository {
    db: FirebaseFirestore.Firestore;
    collection: FirebaseFirestore.CollectionReference;

    constructor(@Inject('FIREBASE_APP') private firebaseApp: app.App) {
        this.db = firebaseApp.firestore();
        this.collection = this.db.collection('transactions');
    }

    async addTransaction(transaction: FStore_Transaction): Promise<FStore_Transaction> {
        const docRef = this.collection.doc(transaction.transactionId);
        await docRef.set(transaction);
        return transaction;
    }
}