export interface FStore_Transaction {
    transactionId: string;
    amount: number;
    timestamp: Date;
    description?: string;
    username: string;
    branchCode?: string;
}

export const transactionConverter = {
    toFirestore(transaction: FStore_Transaction) {
        return {
            transactionId: transaction.transactionId,
            amount: transaction.amount,
            timestamp: transaction.timestamp,
            description: transaction.description,
            username: transaction.username,
            branchCode: transaction.branchCode,
        };
    },
    fromFirestore(snapshot: FirebaseFirestore.DocumentSnapshot) {
        const data = snapshot.data();
        if (!data) {
            throw new Error("Document data is undefined");
        }
        return {
            transactionId: data.transactionId,
            amount: data.amount,
            timestamp: data.timestamp.toDate(),
            description: data.description,
            username: data.username,
            branchCode: data.branchCode,
        } as FStore_Transaction;
    },
};