import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FStore_TransactionRepository } from './repositories/transactions.repository';

const firebaseProvider = {
  provide: 'FIREBASE_APP',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const firebaseConfig = {
      type: "service_account",
      universe_domain: "googleapis.com",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      project_id: configService.get<string>('FIREBASE_PROJECT_ID'),
      private_key_id: configService.get<string>('FIREBASE_PRIVATE_KEY_ID'),
      private_key: configService.get<string>('FIREBASE_PRIVATE_KEY'),
      client_email: configService.get<string>('FIREBASE_CLIENT_EMAIL'),
      client_id: configService.get<string>('FIREBASE_CLIENT_ID'),
      client_x509_cert_url: configService.get<string>('FIREBASE_CLIENT_CERT_URL'),
    } as admin.ServiceAccount;

    return admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
      storageBucket: `${firebaseConfig.projectId}.appspot.com`,
    });
  },
};

@Module({
  imports: [ConfigModule],
  providers: [
    firebaseProvider,
    FStore_TransactionRepository,
  ],
  exports: [
    FStore_TransactionRepository,
  ],
})
export class FirebaseModule { }