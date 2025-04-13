import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';

import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Daily,
  Holiday,
  Leave,
  Meeting,
  Msg,
  Order,
  Remind,
  User,
  VoiceChannels,
  WorkFromHome,
  CompanyTrip,
  Opentalk,
  Uploadfile,
  CheckList,
  Subcategorys,
  BirthDay,
  Bwl,
  BwlReaction,
  CheckCamera,
  Conversation,
  Dating,
  GuildData,
  JoinCall,
  Keep,
  Penalty,
  Quiz,
  TimeVoiceAlone,
  TrackerSpentTime,
  TX8,
  UserQuiz,
  Wiki,
  WomenDay,
  Channel,
  Mentioned,
  Workout,
  IndividualChannel,
  EventEntity,
  ImportantSMS,
  WOL,
  Dynamic,
  ChannelMezon,
  MentionedPmConfirm,
  QuizMsg,
  MezonBotMessage,
  RoleMezon,
  DynamicMezon,
  News,
  BetEventMezon,
  EventMezon,
  MezonTrackerStreaming,
  UnlockTimeSheet,
  AbsenceDayRequest,
  W2Request,
  Transaction,
  Application,
  VoucherEntiTy,
  InterviewerReply,
  MenuOrderMessage,
  InvoiceOrder,
  MenuAddress,
} from './models';
import { BotGateway } from './events/bot.gateway';
import { DailyCommand } from './asterisk-commands/commands/daily/daily.command';
import { Asterisk } from './asterisk-commands/asterisk';
import { WolCommand } from './asterisk-commands/commands/wol/wol.command';
import { UserInfoCommand } from './asterisk-commands/commands/user-info/userInfo.command';
import { UserStatusCommand } from './asterisk-commands/commands/user-status/userStatus.command';
import { UserStatusService } from './asterisk-commands/commands/user-status/userStatus.service';
import { ClientConfigService } from './config/client-config.service';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TimeSheetService } from './services/timesheet.services';
import { FFmpegService } from './services/ffmpeg.service';
import { AxiosClientService } from './services/axiosClient.services';
import { OrderCommand } from './asterisk-commands/commands/order/order.command';
import { WolCommandService } from './asterisk-commands/commands/wol/wol.services';
import { OrderCommandService } from './asterisk-commands/commands/order/order.services';
import { UtilsService } from './services/utils.services';
import { MeetingService } from './asterisk-commands/commands/meeting/meeting.services';
import { MeetingCommand } from './asterisk-commands/commands/meeting/meeting.command';
import { HelpCommand } from './asterisk-commands/commands/help/help.command';
import { ReportDailyService } from './asterisk-commands/commands/report/reportDaily.service';
import { ReportCommand } from './asterisk-commands/commands/report/report.command';
import { ExtendersService } from './services/extenders.services';
import { AvatarCommand } from './asterisk-commands/commands/avatar/avatar.command';
import { MentionSchedulerService } from './scheduler/mention-scheduler.services';
import { ScheduleModule } from '@nestjs/schedule';
import { ToggleActiveCommand } from './asterisk-commands/commands/toggleactivation/toggleactivation.command';
import { ToggleActiveService } from './asterisk-commands/commands/toggleactivation/toggleactivation.serivces';
import { PenaltyCommand } from './asterisk-commands/commands/penalty/penalty.command';
import { PenaltyService } from './asterisk-commands/commands/penalty/penalty.services';
import { WFHSchedulerService } from './scheduler/wfh-scheduler.service';
import {
  EventListenerChannelCreated,
  EventListenerChannelDeleted,
  EventListenerChannelMessage,
  EventListenerChannelUpdated,
  EventListenerMessageReaction,
  EventListenerUserChannelAdded,
  EventListenerUserChannelRemoved,
} from './listeners';
import { QuizService } from './services/quiz.services';
import { Ncc8Command } from './asterisk-commands/commands/ncc8/ncc8.commnad';
import { AudiobookCommand } from './asterisk-commands/commands/audiobook/audiobook.command';
import { SendMessageSchedulerService } from './scheduler/send-message-scheduler.services';
import { HolidayCommand } from './asterisk-commands/commands/holiday/holiday.command';
import { MeetingSchedulerService } from './scheduler/meeting-scheduler.services';
import { KomubotrestController } from './komubot-rest/komubot-rest.controller';
import { KomubotrestService } from './komubot-rest/komubot-rest.service';
import { EventGiveCoffee } from './listeners/givecoffee.handle';
import { ReportHolidayService } from './asterisk-commands/commands/report/reportHoliday.service';
import { ReportOrderService } from './asterisk-commands/commands/report/reportOrder.service';
import { KomuService } from './services/komu.services';
import { MessageQueue } from './services/messageQueue.service';
import { MessageCommand } from './services/messageCommand.service';
import { NotificationCommand } from './asterisk-commands/commands/notification/noti.command';
import { MovieCommand } from './asterisk-commands/commands/movie/movie.command';
import { EventAddClanUser } from './listeners/addclanuser.handle';
import { ChannelDMMezon } from './models/channelDmMezon.entity';
import { ReportWFHService } from './utils/report-wfh.serivce';
import { EventUserClanRemoved } from './listeners/userclanremoved.handle';
import { ReportMentionService } from './services/reportMention.serivce';
import { ReportTrackerService } from './services/reportTracker.sevicer';
import { CallCommand } from './asterisk-commands/commands/call/call.command';
import { WhereCommand } from './asterisk-commands/commands/where/where.command';
import { PollCommand } from './asterisk-commands/commands/poll/poll.command';
import { PollService } from './services/poll.service';
import { PollSchedulerService } from './scheduler/poll-scheduler.service';
import { CheckChannelCommand } from './asterisk-commands/commands/checkprivatechannel/checkchannel.command';
import { ToggleCheckChannelCommand } from './asterisk-commands/commands/checkprivatechannel/updatechannel.command';
import { EventCommand } from './asterisk-commands/commands/event/event.command';
import { EventService } from './asterisk-commands/commands/event/event.service';
import { EventSchedulerService } from './scheduler/event-scheduler.service';
import { Ncc8SchedulerService } from './scheduler/ncc8.scheduler.service';
import { FineReportSchedulerService } from './scheduler/fine-report.scheduler.service';
import { EventRole } from './listeners/role.handle';
import { EventRoleAsign } from './listeners/roleasign.handle';
import { WeatherCommand } from './asterisk-commands/commands/weather/weather.command';
import { DynamicCommand } from './asterisk-commands/commands/register/register.command';
import { DynamicExcuteCommand } from './asterisk-commands/commands/dynamic/dynamic.command';
import { DynamicCommandService } from './services/dynamic.service';
import { NewsScheduler } from './scheduler/news-scheduler.service';
import { EventClanEventCreated } from './listeners/claneventcreated.handle';
import { BetCommand } from './asterisk-commands/commands/bet/bet.command';
import { EventTokenSend } from './listeners/tokensend.handle';
import { QRCodeCommand } from './asterisk-commands/commands/qrcode/qrcode.command';
import { MessageButtonClickedEvent } from './listeners/messagebuttonclick.handle';
import { StreamingEvent } from './listeners/streamingevent.handle';
import { UnlockTimeSheetCommand } from './asterisk-commands/commands/unlocktimesheet/unlockts.command';
import { MusicCommand } from './asterisk-commands/commands/music/music.command';
import { MusicService } from './services/music.services';
import { RequestAbsenceDayCommand } from './asterisk-commands/commands/absencedayrequest/absenceday.command';
import { LogTimeSheetCommand } from './asterisk-commands/commands/logtimesheet/logtimesheet.command';
import { W2RequestCommand } from './asterisk-commands/commands/w2Requests/W2Request.command';
import { RequestTaskW2Controller } from './komubot-rest/requestTaskW2.controller';
import { VoucherCommand } from './asterisk-commands/commands/voucher/voucher.command';
import { DailyPmCommand } from './asterisk-commands/commands/daily/dailypm.command';
import { InterviewSchedulerService } from './scheduler/interview-scheduler.service';
import { ToggleBuzzCommand } from './asterisk-commands/commands/togglebuzz/togglebuzz.command';
import { MenuOrder } from './models/menuOrder.entity';
import { MenuCommand } from './asterisk-commands/commands/menu/menu.command';
import { MenuOrderService } from './services/menuOrder.services';
import { FirebaseModule } from '../firebase/firebase.module';

// import { CronjobSlashCommand } from "./slash-commands/cronjob.slashcommand";

@Module({
  imports: [
    MulterModule.register({
      dest: './files',
    }),
    DiscoveryModule,
    TypeOrmModule.forFeature([
      MentionedPmConfirm,
      ChannelMezon,
      BwlReaction,
      Bwl,
      Daily,
      Penalty,
      Order,
      Leave,
      Holiday,
      User,
      Meeting,
      VoiceChannels,
      WorkFromHome,
      Msg,
      Remind,
      Uploadfile,
      Opentalk,
      CompanyTrip,
      CheckList,
      Subcategorys,
      Channel,
      Daily,
      TX8,
      WomenDay,
      BirthDay,
      UserQuiz,
      Dating,
      JoinCall,
      CheckCamera,
      TrackerSpentTime,
      Conversation,
      TimeVoiceAlone,
      GuildData,
      Quiz,
      Keep,
      Wiki,
      Workout,
      Mentioned,
      IndividualChannel,
      EventEntity,
      ImportantSMS,
      WOL,
      Dynamic,
      QuizMsg,
      ChannelDMMezon,
      MezonBotMessage,
      RoleMezon,
      DynamicMezon,
      News,
      EventMezon,
      BetEventMezon,
      MezonTrackerStreaming,
      UnlockTimeSheet,
      AbsenceDayRequest,
      W2Request,
      Transaction,
      Application,
      VoucherEntiTy,
      InterviewerReply,
      MenuOrder,
      InvoiceOrder,
      MenuOrderMessage,
      MenuAddress
    ]),
    HttpModule,
    ScheduleModule.forRoot(),
    FirebaseModule,
  ],
  providers: [
    BotGateway,
    WolCommand,
    WolCommandService,
    UserInfoCommand,
    UserStatusCommand,
    OrderCommand,
    OrderCommandService,
    MeetingCommand,
    MeetingService,
    HelpCommand,
    ReportCommand,
    AvatarCommand,
    PenaltyCommand,
    PenaltyService,
    UserStatusService,
    ClientConfigService,
    ConfigService,
    ExtendersService,
    Asterisk,
    TimeSheetService,
    FFmpegService,
    UtilsService,
    AxiosClientService,
    MentionSchedulerService,
    ToggleActiveCommand,
    ToggleActiveService,
    Ncc8Command,
    AudiobookCommand,
    MusicCommand,
    ReportDailyService,
    HolidayCommand,
    EventListenerChannelMessage,
    EventListenerMessageReaction,
    EventListenerChannelCreated,
    EventListenerChannelUpdated,
    EventListenerChannelDeleted,
    EventListenerUserChannelAdded,
    EventListenerUserChannelRemoved,
    EventGiveCoffee,
    EventAddClanUser,
    EventRole,
    EventRoleAsign,
    QuizService,
    WFHSchedulerService,
    MeetingSchedulerService,
    SendMessageSchedulerService,
    KomubotrestService,
    ReportHolidayService,
    ReportOrderService,
    DynamicCommand,
    DynamicExcuteCommand,
    KomuService,
    MessageQueue,
    MessageCommand,
    NotificationCommand,
    MovieCommand,
    ReportWFHService,
    EventUserClanRemoved,
    ReportMentionService,
    ReportTrackerService,
    MusicService,
    CallCommand,
    WhereCommand,
    PollCommand,
    PollService,
    PollSchedulerService,
    CheckChannelCommand,
    ToggleCheckChannelCommand,
    EventCommand,
    EventService,
    EventSchedulerService,
    Ncc8SchedulerService,
    FineReportSchedulerService,
    WeatherCommand,
    DynamicCommandService,
    NewsScheduler,
    EventClanEventCreated,
    EventTokenSend,
    BetCommand,
    QRCodeCommand,
    MessageButtonClickedEvent,
    StreamingEvent,
    UnlockTimeSheetCommand,
    RequestAbsenceDayCommand,
    DailyCommand,
    LogTimeSheetCommand,
    W2RequestCommand,
    VoucherCommand,
    DailyPmCommand,
    InterviewSchedulerService,
    ToggleBuzzCommand,
    MenuCommand,
    MenuOrderService,
  ],
  controllers: [KomubotrestController, RequestTaskW2Controller],
})
export class BotModule {}
