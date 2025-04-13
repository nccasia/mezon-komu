import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EMarkdownType, Events, TokenSentEvent } from 'mezon-sdk';
import { BaseHandleEvent } from './base.handle';
import { MezonClientService } from 'src/mezon/services/client.service';
import { MessageQueue } from '../services/messageQueue.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Application,
  BetEventMezon,
  Transaction,
  UnlockTimeSheet,
  User,
  VoucherEntiTy,
} from '../models';
import {
  EmbedProps,
  EMessageMode,
  EUnlockTimeSheetPayment,
  EUserType,
  MEZON_EMBED_FOOTER,
} from '../constants/configs';
import { ReplyMezonMessage } from '../asterisk-commands/dto/replyMessage.dto';
import { AxiosClientService } from '../services/axiosClient.services';
import { ClientConfigService } from '../config/client-config.service';
import { generateEmail, getRandomColor } from '../utils/helper';
import { FStore_TransactionRepository } from '../../firebase/repositories/transactions.repository';
import { extractBranchCodeByTaphoaRemark } from '../utils/extract-text';


@Injectable()
export class EventTokenSend extends BaseHandleEvent {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(BetEventMezon)
    private betEventMezonRepository: Repository<BetEventMezon>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private messageQueue: MessageQueue,
    @InjectRepository(UnlockTimeSheet)
    private unlockTimeSheetRepository: Repository<UnlockTimeSheet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    @InjectRepository(VoucherEntiTy)
    private voucherRepository: Repository<VoucherEntiTy>,
    private axiosClientService: AxiosClientService,
    private clientConfigService: ClientConfigService,
    private readonly dataSource: DataSource,
    private readonly firestoreTransactionRepository: FStore_TransactionRepository,
  ) {
    super(clientService);
  }

  @OnEvent(Events.TokenSend)
  async handleReceivingToken(data) {
    if (data.receiver_id !== process.env.BOT_KOMU_ID) return;
    const sender = await this.userRepository.findOne({
      where: { userId: data.sender_id },
    });
    await this.firestoreTransactionRepository.addTransaction({
      transactionId: data?.transaction_id,
      username: sender?.clan_nick || sender?.username || 'unknown',
      amount: data.amount,
      description: data.note,
      timestamp: new Date(),
      branchCode: extractBranchCodeByTaphoaRemark(data.note),
    });
    const embed: EmbedProps[] = [
      {
        color: getRandomColor(),
        title: `KOMU BALANCE NOTIFICATIONS`,
        fields: [
          {
            name: `Transaction id:`,
            value: `${data?.transaction_id}`,
          },
          {
            name: `Sender name:`,
            value: `${sender?.clan_nick || sender?.username || 'unknown'}`,
          },
          {
            name: `Funds Transferred:`,
            value: `${data.amount}₫`,
          },
          {
            name: `Detail:`,
            value: `${data.note}`,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: MEZON_EMBED_FOOTER,
      },
    ];
    const replyMessage = {
      clan_id: process.env.KOMUBOTREST_CLAN_NCC_ID,
      channel_id: process.env.MEZON_TAPHOA_CHANNEL_ID || '1840679163397148672',
      is_public: false,
      parent_id: '0',
      mode: EMessageMode.THREAD_MESSAGE,
      msg: {
        embed,
      },
    };
    this.messageQueue.addMessage(replyMessage);
  }

  @OnEvent(Events.TokenSend)
  async handleBetEvent(data) {
    try {
      if (data.receiver_id !== process.env.BOT_KOMU_ID) return;
      const arg = data.note.split(' ');
      const sendType = arg?.[0]?.slice(1);
      const betId = arg?.[2]?.slice(0, -1);
      // check type bet
      if (sendType !== 'BET' || !betId) return;
      // TODO: real query for findEvent
      // const findEvent = await this.betEventMezonRepository.findOne({
      //   where: { userId: data.sender_id, amount: 0, id: data.bet_id },
      // });

      // fake data
      const findEvent = await this.betEventMezonRepository.find({
        where: { userId: data.sender_id, amount: 0 },
      });

      if (findEvent[0]) {
        // fake data, real: if (findEvent) {}
        const findUser = await this.userRepository.findOne({
          where: { userId: findEvent[0].userId },
        });
        await this.betEventMezonRepository.update(
          { id: findEvent[0].id },
          { amount: data.amount },
        );
        // send to user
        const messageTextDM =
          '```' +
          `[BET - ${findEvent[0].id}]\n✅You just paid ${data.amount} token successfully. Let's wait for the results!` +
          '```';
        const messageToUser: ReplyMezonMessage = {
          userId: findEvent[0].userId,
          textContent: messageTextDM,
          messOptions: { mk: [{ type: 't', s: 0, e: messageTextDM.length }] },
        };
        this.messageQueue.addMessage(messageToUser);
        // send to channel
        const messageText =
          '```' +
          `[BET - ${findEvent[0].id}]\n✅${findUser.username} just paid successfully!` +
          '```';
        const replyMessage = {
          clan_id: process.env.KOMUBOTREST_CLAN_NCC_ID,
          channel_id: process.env.MEZON_BET_CHANNEL_ID || '1840655908913287168',
          is_public: false,
          parent_id: '0',
          mode: EMessageMode.THREAD_MESSAGE,
          msg: {
            t: messageText,
            mk: [{ type: EMarkdownType.TRIPLE, s: 0, e: messageText.length }],
          },
        };
        this.messageQueue.addMessage(replyMessage);
      }
    } catch (error) {
      console.log('handleTokenSend', error);
    }
  }

  @OnEvent(Events.TokenSend)
  async handleUnlockTimesheet(data) {
    if (!data?.note || data.receiver_id !== process.env.BOT_KOMU_ID) return; // check send to bot
    try {
      const arg = data.note.split(' ');
      const sendType = arg?.[0]?.slice(1);
      const unlocktsId = arg?.[2]?.slice(0, -1);
      // check type unlockts
      if (sendType !== 'UNLOCKTS' || !unlocktsId) return;
      const findUnlockTs = await this.unlockTimeSheetRepository.findOne({
        where: { id: unlocktsId },
      });

      // check unlockts exist and check sender_id
      if (!findUnlockTs || data.sender_id !== findUnlockTs.userId) return;

      // update amount user sent
      await this.unlockTimeSheetRepository.update(
        { id: findUnlockTs.id },
        { payment: data.amount },
      );

      // check send not enought
      if (findUnlockTs.amount > data.amount) {
        const embed: EmbedProps[] = [
          {
            color: '#ED4245',
            title: `❌You pay token but not enought to unlock timesheet!\n\tPlease contact with ADMIN for support!`,
          },
        ];
        const messageToUser: ReplyMezonMessage = {
          userId: findUnlockTs.userId,
          textContent: '',
          messOptions: { embed },
        };
        this.messageQueue.addMessage(messageToUser);
        return;
      }

      // user pay success -> not processed
      if (findUnlockTs.amount <= findUnlockTs.payment) {
        const embed: EmbedProps[] = [
          {
            color: '#F1C40F',
            title: `This request has been processed!\nKOMU sent token back to you. Please create new request to unlock timesheet!`,
          },
        ];
        const dataSendToken = {
          sender_id: process.env.BOT_KOMU_ID,
          sender_name: 'KOMU',
          receiver_id: findUnlockTs.userId,
          amount: +data.amount,
        };
        await this.client.sendToken(dataSendToken);
        const messageToUser: ReplyMezonMessage = {
          userId: findUnlockTs.userId,
          textContent: '',
          messOptions: { embed },
        };
        this.messageQueue.addMessage(messageToUser);
        return;
      }

      const findUser = await this.userRepository.findOne({
        where: { userId: findUnlockTs.userId, user_type: EUserType.MEZON },
      });

      try {
        const resUnlockTs = await this.axiosClientService.post(
          `${
            findUnlockTs.amount === EUnlockTimeSheetPayment.PM_PAYMENT
              ? this.clientConfigService.unlockTsPMApi.api_url +
                `?emailAddress=${generateEmail(findUser.clan_nick || findUser.username)}&client=MEZON`
              : this.clientConfigService.unlockTsStaffApi.api_url +
                `?emailAddress=${generateEmail(findUser.clan_nick || findUser.username)}&client=MEZON`
          }`,
          {},
          {
            httpsAgent: this.clientConfigService.https,
            headers: {
              securityCode: this.clientConfigService.imsKeySecret,
            },
          },
        );

        if (resUnlockTs?.data?.success) {
          const embedUnlockSuccess: EmbedProps[] = [
            {
              color: '#57F287',
              title: `✅Unlock timesheet successful!`,
            },
          ];
          const messageToUser: ReplyMezonMessage = {
            userId: findUnlockTs.userId,
            textContent: '',
            messOptions: { embed: embedUnlockSuccess },
          };
          this.messageQueue.addMessage(messageToUser);
        } else {
          throw 'Unlock fail!';
        }
      } catch (error) {
        console.log('handleCallApiError', error);
        const title =
          'Unlock timesheet failed. Please contact ADMIN for support!\n\tKOMU sent token back to you!';
        this.handleSendBackTokenToUser(
          findUnlockTs.userId,
          +data.amount,
          title,
        );
      }
    } catch (error) {
      console.log('handleUnlockTimesheet');
    }
  }

  @OnEvent(Events.TokenSend)
  async handlePayoutApplication(data) {
    const appIdWhiteList = [
      'buy_NccSoft_voucher',
      'buy_Market_voucher',
      'send_by_api',
    ];
    try {
      const extraAttribute = JSON.parse(
        data?.extra_attribute || JSON.stringify({}),
      );
      const findApp = await this.applicationRepository.findOne({
        where: { id: extraAttribute?.appId },
      });

      const checkWhiteList = appIdWhiteList.includes(extraAttribute?.appId);

      if (findApp || checkWhiteList) {
        const appId = extraAttribute?.appId ?? `unknown-${Date.now()}`;
        const sessionId = checkWhiteList
          ? `${extraAttribute?.sessionId}-${data.sender_id}-${Date.now()}`
          : (extraAttribute?.sessionId ?? `unknown-${Date.now()}`);
        const transactionDataInsert = new Transaction();
        transactionDataInsert.id =
          data?.transaction_id || sessionId + data.sender_name;
        transactionDataInsert.appId = appId;
        transactionDataInsert.sessionId = sessionId;
        transactionDataInsert.username = data.sender_name;
        transactionDataInsert.senderId = data.sender_id;
        transactionDataInsert.receiverId = data.receiver_id;
        transactionDataInsert.amount = data.amount;
        transactionDataInsert.createdAt = Date.now();
        const dataSave = await this.transactionRepository.save(
          transactionDataInsert,
        );
        if (dataSave?.id && checkWhiteList) {
          if (extraAttribute?.appId === 'buy_NccSoft_voucher') {
            this.handleBuyNccSoftVoucher(data);
          }
          if (extraAttribute?.appId === 'buy_Market_voucher') {
            this.handleBuyMarketVoucher(data);
          }
        }
      }
    } catch (error) {
      console.log('ERROR handlePayoutApplication', error);
    }
  }

  async handleBuyNccSoftVoucher(data) {
    const findUser = await this.userRepository.findOne({
      where: { userId: data.sender_id },
    });
    if (!findUser) return;
    try {
      const response = await this.axiosClientService.post(
        `${this.clientConfigService.voucherApi.buyVoucher}`,
        {
          value: data.amount,
          gmail: `${findUser?.clan_nick || findUser.username}@ncc.asia`,
        },
        {
          headers: {
            'X-Secret-Key': process.env.VOUCHER_X_SECRET_KEY,
          },
        },
      );
      if (response?.data?.message) {
        const embedUnlockSuccess: EmbedProps[] = [
          {
            color: '#57F287',
            title: `✅Exchange NCCSoft voucher successful!`,
          },
        ];
        const messageToUser: ReplyMezonMessage = {
          userId: data.sender_id,
          textContent: '',
          messOptions: { embed: embedUnlockSuccess },
        };
        this.messageQueue.addMessage(messageToUser);
      }
    } catch (error) {
      let messageContent = error?.response?.data?.message ?? 'Error';
      if (error?.response?.data?.statusCode === 404) {
        messageContent = `User not found! Please go https://voucher.nccsoft.vn/ to create an account. KOMU sent ${data.amount ?? ''} token back to you!`;
      }
      this.handleSendBackTokenToUser(
        data.sender_id,
        data.amount,
        messageContent,
      );
    }
  }

  async handleBuyMarketVoucher(data: TokenSentEvent) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (data.amount !== 100000) {
        const messageContent = `Amount received is different from amount requested\n(Requested 100.000 token). KOMU sent ${data.amount ?? ''} token back to you!`;
        this.handleSendBackTokenToUser(
          data.sender_id,
          data.amount,
          messageContent,
        );
        return;
      }
      const voucherActiveList = await queryRunner.manager
        .createQueryBuilder('komu_voucher', 'voucher')
        .setLock('pessimistic_write')
        .where('voucher.active = :active', { active: true })
        .andWhere('CAST(voucher.expiredDate AS DATE) > CURRENT_DATE')
        .getMany();
      if (!voucherActiveList?.length) {
        const messageContent = `No vouchers were found left. Contact admin for help!\n KOMU sent ${data.amount ?? ''} token back to you!`;
        this.handleSendBackTokenToUser(
          data.sender_id,
          data.amount,
          messageContent,
        );
        await queryRunner.rollbackTransaction();
        return;
      }
      const listVoucherAvailable = voucherActiveList.map(
        (voucher) => voucher.link,
      );
      const voucherAvailable =
        listVoucherAvailable[
          Math.floor(Math.random() * listVoucherAvailable.length)
        ];
      if (voucherAvailable) {
        const embedUnlockSuccess: EmbedProps[] = [
          {
            color: '#57F287',
            title: `✅Exchange Market voucher successful!\nYour voucher is:`,
            description: '```' + voucherAvailable + '```',
          },
        ];
        const messageToUser: ReplyMezonMessage = {
          userId: data.sender_id,
          textContent: '',
          messOptions: { embed: embedUnlockSuccess },
        };
        this.messageQueue.addMessage(messageToUser);
        await queryRunner.manager.update(
          'komu_voucher',
          { link: voucherAvailable },
          { active: false, userId: data.sender_id, buyAt: Date.now() },
        );
        await queryRunner.commitTransaction();
      }
    } catch (error) {
      const messageContent = `Exchange voucher error!\n KOMU sent ${data.amount ?? ''} token back to you!`;
      this.handleSendBackTokenToUser(
        data.sender_id,
        data.amount,
        messageContent,
      );
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async handleSendBackTokenToUser(
    userId: string,
    amount: number,
    title: string,
  ) {
    const embedUnlockSuccess: EmbedProps[] = [
      {
        color: '#ED4245',
        title: `❌${title}`,
      },
    ];
    const messageToUser: ReplyMezonMessage = {
      userId: userId,
      textContent: '',
      messOptions: { embed: embedUnlockSuccess },
    };
    this.messageQueue.addMessage(messageToUser);

    // send back money to user when api get error
    const dataSendToken = {
      sender_id: process.env.BOT_KOMU_ID,
      sender_name: 'KOMU',
      receiver_id: userId,
      amount: +amount,
    };
    await this.client.sendToken(dataSendToken);
  }
}
