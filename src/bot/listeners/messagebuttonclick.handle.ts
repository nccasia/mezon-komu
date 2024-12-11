/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { ChannelMessage, Events } from 'mezon-sdk';
import { BaseHandleEvent } from './base.handle';
import { MezonClientService } from 'src/mezon/services/client.service';
import {
  EmbedProps,
  EMessageMode,
  ERequestAbsenceDayStatus,
  ERequestAbsenceDayType,
  EUnlockTimeSheet,
  EUnlockTimeSheetPayment,
  FFmpegImagePath,
  FileType,
  MEZON_EMBED_FOOTER,
} from '../constants/configs';
import { MessageQueue } from '../services/messageQueue.service';
import { Daily, Quiz, UnlockTimeSheet, User, UserQuiz } from '../models';
import { AbsenceDayRequest } from '../models';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReplyMezonMessage } from '../asterisk-commands/dto/replyMessage.dto';
import {
  checkAnswerFormat,
  createReplyMessage,
  generateEmail,
  generateQRCode,
  getRandomColor,
  getUserNameByEmail,
  sleep,
} from '../utils/helper';
import { QuizService } from '../services/quiz.services';
import { refGenerate } from '../utils/generateReplyMessage';
import { MusicService } from '../services/music.services';
import { FFmpegService } from '../services/ffmpeg.service';
import { ChannelDMMezon } from '../models/channelDmMezon.entity';
import { TimeSheetService } from '../services/timesheet.services';
import {
  checkTimeNotWFH,
  checkTimeSheet,
} from '../asterisk-commands/commands/daily/daily.functions';
import { AxiosClientService } from '../services/axiosClient.services';
import { ClientConfigService } from '../config/client-config.service';
import {
  handleBodyRequestAbsenceDay,
  validateAbsenceTime,
  validateAbsenceTypeDay,
  validateAndFormatDate,
  validateHourAbsenceDay,
  validateTypeAbsenceDay,
  validReasonAbsenceDay,
} from '../utils/request-helper';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class MessageButtonClickedEvent extends BaseHandleEvent {
  constructor(
    clientService: MezonClientService,
    private messageQueue: MessageQueue,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserQuiz)
    private userQuizRepository: Repository<UserQuiz>,
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    private quizService: QuizService,
    @InjectRepository(UnlockTimeSheet)
    private unlockTimeSheetRepository: Repository<UnlockTimeSheet>,
    private musicService: MusicService,
    private ffmpegService: FFmpegService,
    @InjectRepository(ChannelDMMezon)
    private channelDmMezonRepository: Repository<ChannelDMMezon>,

    private timeSheetService: TimeSheetService,
    @InjectRepository(User)
    private dailyRepository: Repository<Daily>,
    @InjectRepository(AbsenceDayRequest)
    private absenceDayRequestRepository: Repository<AbsenceDayRequest>,
    private axiosClientService: AxiosClientService,
    private clientConfigService: ClientConfigService,
  ) {
    super(clientService);
  }
  @OnEvent(Events.MessageButtonClicked)
  async hanndleButtonForm(data) {
    const args = data.button_id.split('_');
    // check case by buttonId
    const buttonConfirmType = args[0];
    switch (buttonConfirmType) {
      case 'question':
        this.handleAnswerQuestionWFH(data);
        break;
      case 'music':
        this.handleMusicEvent(data);
        break;
      case 'unlockTs':
        this.handleUnlockTimesheet(data);
        break;
      case ERequestAbsenceDayType.REMOTE:
      case ERequestAbsenceDayType.ONSITE:
      case ERequestAbsenceDayType.OFF:
      case ERequestAbsenceDayType.OFFCUSTOM:
        this.handleRequestAbsenceDay(data);
        break;
      case 'daily':
        this.handleSubmitDaily(data);
        break;
      default:
        break;
    }
  }

  async handleAnswerQuestionWFH(data) {
    try {
      const args = data.button_id.split('_');
      if (args[0] !== 'question') return;
      const answer = args[1];
      const channelDmId = args[2];
      await this.userRepository.update(
        { userId: data.user_id },
        {
          botPing: false,
        },
      );
      const userQuiz = await this.userQuizRepository
        .createQueryBuilder()
        .where('"channel_id" = :channel_id', {
          channel_id: channelDmId,
        })
        .andWhere('"message_id" = :mess_id', {
          mess_id: data.message_id,
        })
        .select('*')
        .getRawOne();
      let mess = '';
      const messOptions = {};
      if (userQuiz['answer']) {
        mess = `Bạn đã trả lời câu hỏi này rồi`;
      } else {
        const question = await this.quizRepository
          .createQueryBuilder()
          .where('id = :quizId', { quizId: userQuiz['quizId'] })
          .select('*')
          .getRawOne();
        if (question) {
          if (!checkAnswerFormat(answer, question['options'].length)) {
            mess = `Bạn vui lòng trả lời đúng số thứ tự các đáp án câu hỏi`;
          } else {
            const correctAnser = Number(answer) === Number(question['correct']);
            if (correctAnser) {
              const newUser = await this.quizService.addScores(
                userQuiz['userId'],
              );
              if (!newUser) return;
              mess = `Correct!!!, you have ${newUser[0].scores_quiz} points`;
              await this.quizService.saveQuestionCorrect(
                userQuiz['userId'],
                userQuiz['quizId'],
                Number(answer),
              );
            } else {
              mess = `Incorrect!!!, The correct answer is ${question['correct']}`;
              await this.quizService.saveQuestionInCorrect(
                userQuiz['userId'],
                userQuiz['quizId'],
                Number(answer),
              );
            }

            const link = `https://quiz.nccsoft.vn/question/update/${userQuiz['quizId']}`;
            messOptions['embed'] = [
              {
                color: `${correctAnser ? '#1E9F2E' : '#ff0101'}`,
                title: `${mess}`,
              },
              {
                color: `${'#ff0101'}`,
                title: `Complain`,
                url: link,
              },
            ];
          }
        }
      }
      const KOMU = await this.userRepository.findOne({
        where: { userId: process.env.BOT_KOMU_ID },
      });
      const msg: ChannelMessage = {
        message_id: data.message_id,
        id: '',
        channel_id: channelDmId,
        channel_label: '',
        code: EMessageMode.DM_MESSAGE,
        create_time: '',
        sender_id: process.env.BOT_KOMU_ID,
        username: KOMU.username || 'KOMU',
        avatar: KOMU.avatar,
        content: { t: '' },
        attachments: [{}],
      };
      const messageToUser: ReplyMezonMessage = {
        userId: data.user_id,
        textContent: userQuiz['answer'] ? mess : '',
        messOptions: messOptions,
        attachments: [],
        refs: refGenerate(msg),
      };
      this.messageQueue.addMessage(messageToUser);
    } catch (error) {
      console.log('handleMessageButtonClicked', error);
    }
  }

  async handleMusicEvent(data) {
    const args = data.button_id.split('_');
    if (args[0] != 'music') {
      return;
    }

    if (args[1] == 'search') {
      const KOMU = await this.userRepository.findOne({
        where: { userId: data.sender_id },
      });
      const msg: ChannelMessage = {
        message_id: data.message_id,
        clan_id: process.env.KOMUBOTREST_CLAN_NCC_ID,
        mode: +args[6],
        is_public: Boolean(+args[5]),
        id: '',
        channel_id: data.channel_id,
        channel_label: '',
        code: EMessageMode.CHANNEL_MESSAGE,
        create_time: '',
        sender_id: data.sender_id,
        username: KOMU?.username || 'KOMU',
        avatar: KOMU?.avatar,
        content: { t: '' },
        attachments: [{}],
      };
      const replyMessage = await this.musicService.getMusicListMessage(
        msg,
        args[2],
        args[3],
        args[4],
      );

      if (replyMessage) {
        const replyMessageArray = Array.isArray(replyMessage)
          ? replyMessage
          : [replyMessage];
        for (const mess of replyMessageArray) {
          this.messageQueue.addMessage({ ...mess, sender_id: msg.sender_id }); // add to queue, send every 0.2s
        }
      }
    } else if (args[1] == 'play') {
      const mp3Link = await this.musicService.getMp3Link(args[2]);
      this.ffmpegService.killCurrentStream(FileType.MUSIC);
      await sleep(1000);
      const channel = await this.client.registerStreamingChannel({
        clan_id: process.env.KOMUBOTREST_CLAN_NCC_ID,
        channel_id: process.env.MEZON_MUSIC_CHANNEL_ID,
      });
      if (!channel) return;
      if (channel?.streaming_url !== '') {
        this.ffmpegService
          .transcodeMp3ToRtmp(
            FFmpegImagePath.NCC8,
            mp3Link,
            channel?.streaming_url,
            FileType.MUSIC,
          )
          .catch((error) => console.log('error mp3', error));
      }
    }
  }

  async handleUnlockTimesheet(data) {
    try {
      const args = data.button_id.split('_');
      const findUnlockTsData = await this.unlockTimeSheetRepository.findOne({
        where: { messageId: data.message_id },
      });
      if (args[0] !== 'unlockTs' || !data?.extra_data || !findUnlockTsData)
        return;
      if (findUnlockTsData.userId !== data.user_id) return; // check auth
      const typeButtonRes = args[1]; // (confirm or cancel)
      const dataParse = JSON.parse(data.extra_data);
      const value = dataParse?.RADIO?.split('_')[1]; // (pm or staff)
      //init reply message
      const replyMessage: ReplyMezonMessage = {
        clan_id: findUnlockTsData.clanId,
        channel_id: findUnlockTsData.channelId,
        is_public: findUnlockTsData.isChannelPublic,
        mode: findUnlockTsData.modeMessage,
        msg: {
          t: '',
        },
      };

      // only process with no status (not confirm or cancel request yet)
      if (!findUnlockTsData.status) {
        // check user press button confirm or cancel
        switch (typeButtonRes) {
          case EUnlockTimeSheet.CONFIRM:
            // data for QR code
            const sendTokenData = {
              sender_id: data.user_id,
              receiver_id: process.env.BOT_KOMU_ID,
              receiver_name: 'KOMU',
              amount:
                value === EUnlockTimeSheet.PM
                  ? EUnlockTimeSheetPayment.PM_PAYMENT
                  : EUnlockTimeSheetPayment.STAFF_PAYMENT, // check pm or staff to get payment value
              note: `[UNLOCKTS - ${findUnlockTsData.id}]`,
            };
            // update status active
            await this.unlockTimeSheetRepository.update(
              { id: findUnlockTsData.id },
              {
                amount: sendTokenData.amount,
                status: EUnlockTimeSheet.CONFIRM,
              },
            );

            // gen QR code
            const qrCodeImage = await generateQRCode(
              JSON.stringify(sendTokenData),
            );
            //
            const channelDM = await this.channelDmMezonRepository.findOne({
              where: { user_id: findUnlockTsData.userId },
            });

            // send QR code to user
            const embed: EmbedProps[] = [
              {
                color: getRandomColor(),
                title: `Click HERE`,
                url: `https://mezon.ai/chat/direct/message/${channelDM?.channel_id}/3?openPopup=true&token=${sendTokenData.amount}&userId=${sendTokenData.receiver_id}&note=${sendTokenData.note}`,
                fields: [
                  {
                    name: 'Or scan this QR code for UNLOCK TIMESHEET!',
                    value: '',
                  },
                ],
                image: {
                  url: qrCodeImage + '',
                },
                timestamp: new Date().toISOString(),
                footer: MEZON_EMBED_FOOTER,
              },
            ];
            const messageToUser: ReplyMezonMessage = {
              userId: data.user_id,
              textContent: '',
              messOptions: { embed },
            };
            this.messageQueue.addMessage(messageToUser);
            replyMessage['msg'] = {
              t: 'KOMU was sent to you a message, please check!',
            };
            break;
          default:
            replyMessage['msg'] = {
              t: 'Cancel unlock timesheet successful!',
            };
            // update status active
            await this.unlockTimeSheetRepository.update(
              { id: findUnlockTsData.id },
              {
                status: EUnlockTimeSheet.CANCEL,
              },
            );
            break;
        }
      } else {
        replyMessage['msg'] = {
          t: `This request has been ${findUnlockTsData.status.toLowerCase()}ed!`,
        };
      }

      // generate ref bot message
      const KOMU = await this.userRepository.findOne({
        where: { userId: process.env.BOT_KOMU_ID },
      });
      const msg: ChannelMessage = {
        message_id: data.message_id,
        id: '',
        channel_id: findUnlockTsData.channelId,
        channel_label: '',
        code: findUnlockTsData.modeMessage,
        create_time: '',
        sender_id: process.env.BOT_KOMU_ID,
        username: KOMU.username || 'KOMU',
        avatar: KOMU.avatar,
        content: { t: '' },
        attachments: [{}],
      };
      replyMessage['ref'] = refGenerate(msg);
      //send message
      this.messageQueue.addMessage(replyMessage);
    } catch (e) {
      console.log('handleUnlockTimesheet', e);
    }
  }
  async handleSubmitDaily(data) {
    console.log('data :', data);
    const senderId = data.user_id;
    const botId = data.sender_id;
    const channelId = data.channel_id;
    const splitButtonId = data.button_id.split('_');
    const messid = splitButtonId[1];
    const clanIdValue = splitButtonId[2];
    const modeValue = splitButtonId[3];
    const codeMessValue = splitButtonId[4];
    const isPublicValue = splitButtonId[5] === 'false' ? false : true;
    const ownerSenderDaily = splitButtonId[6];
    const dateValue = splitButtonId[7];
    const buttonType = splitButtonId[8];
    const invalidLength =
      '```Please enter at least 100 characters in your daily text```';
    const missingField =
      '```Missing project, yesterday, today, or block field```';
    const isOwner = ownerSenderDaily === senderId;
    //init reply message
    const getBotInformation = await this.userRepository.findOne({
      where: { userId: botId },
    });

    const msg: ChannelMessage = {
      message_id: data.message_id,
      id: '',
      channel_id: channelId,
      channel_label: '',
      code: codeMessValue,
      create_time: '',
      sender_id: botId,
      username: getBotInformation.username,
      avatar: getBotInformation.avatar,
      content: { t: '' },
      attachments: [{}],
    };

    const isCancel = buttonType === EUnlockTimeSheet.CANCEL.toLowerCase();
    const isSubmit = buttonType === EUnlockTimeSheet.SUBMIT.toLowerCase();
    try {
      if (!data.extra_data) {
        if (
          (!isOwner && (isCancel || isSubmit)) ||
          (isOwner && (isCancel || isSubmit))
        ) {
          return;
        }
      }
      switch (buttonType) {
        case EUnlockTimeSheet.SUBMIT.toLowerCase():
          let parsedExtraData;
          try {
            parsedExtraData = JSON.parse(data.extra_data);
          } catch (error) {
            throw new Error('Invalid JSON in extra_data');
          }

          const projectKey = `daily-${messid}-project`;
          const yesterdayKey = `daily-${messid}-yesterday-ip`;
          const todayKey = `daily-${messid}-today-ip`;
          const blockKey = `daily-${messid}-block-ip`;
          const workingTimeKey = `daily-${messid}-working-time`;
          const typeOfWorkKey = `daily-${messid}-type-of-work`;
          const taskKey = `daily-${messid}-task`;

          const projectCode = parsedExtraData[projectKey]?.[0];
          const yesterdayValue = parsedExtraData[yesterdayKey];
          const todayValue = parsedExtraData[todayKey];
          const blockValue = parsedExtraData[blockKey];
          const workingTimeValue = parsedExtraData[workingTimeKey];
          const typeOfWorkValue = parsedExtraData[typeOfWorkKey]?.[0];
          const taskValue = parsedExtraData[taskKey]?.[0];

          const isMissingField =
            !projectCode || !yesterdayValue || !todayValue || !blockValue;
          const contentGenerated = `*daily ${projectCode} ${dateValue}\n yesterday:${yesterdayValue}\n today:${todayValue}\n block:${blockValue}`;
          const contentLength =
            yesterdayValue?.length + todayValue?.length + blockValue?.length;

          if (!isOwner) {
            return;
          }
          if (contentLength < 100) {
            const replyMessageInvalidLength = createReplyMessage(
              invalidLength,
              clanIdValue,
              channelId,
              isPublicValue,
              modeValue,
              msg,
            );
            return this.messageQueue.addMessage(replyMessageInvalidLength);
          }
          if (isMissingField) {
            const replyMessageMissingField = createReplyMessage(
              missingField,
              clanIdValue,
              channelId,
              isPublicValue,
              modeValue,
              msg,
            );
            return this.messageQueue.addMessage(replyMessageMissingField);
          }
          const findUser = await this.userRepository
            .createQueryBuilder()
            .where(`"userId" = :userId`, { userId: senderId })
            .andWhere(`"deactive" IS NOT true`)
            .select('*')
            .getRawOne();

          if (!findUser) return;

          const authorUsername = findUser.email;
          const emailAddress = generateEmail(authorUsername);

          const wfhResult = await this.timeSheetService.findWFHUser();
          const wfhUserEmail = wfhResult.map((item) =>
            getUserNameByEmail(item.emailAddress),
          );

          await this.saveDaily(
            senderId,
            channelId,
            contentGenerated as string,
            authorUsername,
          );

          await this.timeSheetService.logTimeSheetForTask(
            todayValue,
            emailAddress,
            projectCode,
            typeOfWorkValue,
            taskValue,
            workingTimeValue,
          );
          const isValidTimeFrame = checkTimeSheet();
          const isValidWFH = checkTimeNotWFH();
          const baseMessage = '```✅ Daily saved.```';
          const errorMessageWFH =
            '```✅ Daily saved. (Invalid daily time frame. Please daily at 7h30-9h30, 12h-17h. WFH not daily 20k/time.)```';
          const errorMessageNotWFH =
            '```✅ Daily saved. (Invalid daily time frame. Please daily at 7h30-17h. not daily 20k/time.)```';

          const messageContent = wfhUserEmail.includes(authorUsername)
            ? isValidTimeFrame
              ? baseMessage
              : errorMessageWFH
            : isValidWFH
              ? baseMessage
              : errorMessageNotWFH;
          const replyMessageSubmit = createReplyMessage(
            messageContent,
            clanIdValue,
            channelId,
            isPublicValue,
            modeValue,
            msg,
          );
          this.messageQueue.addMessage(replyMessageSubmit);
          break;
        case EUnlockTimeSheet.CANCEL.toLowerCase():
          return;
        default:
          break;
      }
    } catch (error) {
      console.error('Error in handleSubmitDaily:', error.message);
    }
  }

  saveDaily(senderId: string, channelId: string, args: string, email: string) {
    return this.dailyRepository
      .createQueryBuilder()
      .insert()
      .into(Daily)
      .values({
        userid: senderId,
        email: email,
        daily: args,
        createdAt: Date.now(),
        channelid: channelId,
      })
      .execute();
  }
  async handleRequestAbsenceDay(data) {
    try {
      // Parse button_id
      const args = data.button_id.split('_');
      const typeRequest = args[0];
      const typeRequestDayEnum =
        ERequestAbsenceDayType[
          typeRequest as keyof typeof ERequestAbsenceDayType
        ];
      if (!data?.extra_data) return;
      // Find absence data
      const findAbsenceData = await this.absenceDayRequestRepository.findOne({
        where: { messageId: data.message_id },
      });
      if (!findAbsenceData) return;

      // Check user authorization
      if (findAbsenceData.userId !== data.user_id) return;

      const typeButtonRes = args[1]; // (confirm or cancel)
      const dataParse = JSON.parse(data.extra_data);

      // Initialize reply message
      const replyMessage: ReplyMezonMessage = {
        clan_id: findAbsenceData.clanId,
        channel_id: findAbsenceData.channelId,
        is_public: findAbsenceData.isChannelPublic,
        mode: findAbsenceData.modeMessage,
        msg: {
          t: '',
        },
      };
      // find emailAddress by senderId
      const findUser = await this.userRepository
        .createQueryBuilder()
        .where(`"userId" = :userId`, { userId: findAbsenceData.userId })
        .andWhere(`"deactive" IS NOT true`)
        .select('*')
        .getRawOne();
      if (!findUser) return;
      const authorUsername = findUser.email;
      const emailAddress = generateEmail(authorUsername);

      // Process only requests without status
      if (!findAbsenceData.status) {
        switch (typeButtonRes) {
          case ERequestAbsenceDayStatus.CONFIRM:
            //valid input and format
            const validDate = validateAndFormatDate(dataParse.dateAt);
            const validHour = validateHourAbsenceDay(
              dataParse.hour || '0',
              typeRequestDayEnum,
            );
            const validTypeDate = validateTypeAbsenceDay(
              dataParse.dateType ? dataParse.dateType[0] : null,
              typeRequestDayEnum,
            );
            const validReason = validReasonAbsenceDay(
              dataParse.reason,
              typeRequestDayEnum,
            );
            const validAbsenceType = validateAbsenceTypeDay(
              dataParse.absenceType ? dataParse.absenceType[0] : null,
              typeRequestDayEnum,
            );
            const validAbsenceTime = validateAbsenceTime(
              dataParse.absenceTime ? dataParse.absenceTime[0] : null,
              typeRequestDayEnum,
            );
            const userId = findAbsenceData.userId;
            const validations = [
              { valid: validDate.valid, message: validDate.message },
              {
                valid: validAbsenceTime.valid,
                message: validAbsenceTime.message,
              },
              { valid: validHour.valid, message: validHour.message },
              { valid: validTypeDate.valid, message: validTypeDate.message },
              {
                valid: validAbsenceType.valid,
                message: validAbsenceType.message,
              },
              { valid: validReason.valid, message: validReason.message },
            ];
            for (const { valid, message } of validations) {
              if (!valid) {
                const embedValidFailure: EmbedProps[] = [
                  {
                    color: '#ED4245',
                    title: `❌ ${message || 'Invalid input'}`,
                  },
                ];
                const messageToUser: ReplyMezonMessage = {
                  userId: userId,
                  textContent: '',
                  messOptions: { embed: embedValidFailure },
                };
                this.messageQueue.addMessage(messageToUser);
                return;
              }
            }

            dataParse.dateAt = validDate?.formattedDate;
            const body = handleBodyRequestAbsenceDay(
              dataParse,
              typeRequest,
              emailAddress,
            );
            try {
              // Call API request absence day
              const resAbsenceDayRequest =
                await this.timeSheetService.requestAbsenceDay(body);
              if (resAbsenceDayRequest?.data?.success) {
                const embedUnlockSuccess: EmbedProps[] = [
                  {
                    color: '#57F287',
                    title: `✅ Request absence successful!`,
                  },
                ];
                const messageToUser: ReplyMezonMessage = {
                  userId: findAbsenceData.userId,
                  textContent: '',
                  messOptions: { embed: embedUnlockSuccess },
                };
                this.messageQueue.addMessage(messageToUser);
              } else {
                throw new Error('Request failed!');
              }
            } catch (error) {
              console.log('handleRequestAbsence', error);
              const embedUnlockFailure: EmbedProps[] = [
                {
                  color: '#ED4245',
                  title: `❌ Request absence failed.`,
                },
              ];
              const messageToUser: ReplyMezonMessage = {
                userId: findAbsenceData.userId,
                textContent: '',
                messOptions: { embed: embedUnlockFailure },
              };
              this.messageQueue.addMessage(messageToUser);
            }
            // Update status to CONFIRM
            await this.absenceDayRequestRepository.update(
              { id: findAbsenceData.id },
              {
                status: ERequestAbsenceDayStatus.CONFIRM,
                reason: body.reason,
                dateType: body.absences[0].dateType,
                absenceTime: body.absences[0].absenceTime,
              },
            );
            break;

          default:
            replyMessage.msg = { t: 'Cancel request absence successful!' };
            // Update status to CANCEL
            await this.absenceDayRequestRepository.update(
              { id: findAbsenceData.id },
              { status: ERequestAbsenceDayStatus.CANCEL },
            );
            break;
        }
      } else {
        replyMessage['msg'] = {
          t: `This request has been ${findAbsenceData.status}ed!`,
        };
      }
    } catch (e) {
      console.error('handleRequestAbsence', e);
    }
  }
}
