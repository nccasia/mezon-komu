export const BOT_ID = process.env.BOT_KOMU_ID;

export const EMAIL_DOMAIN = 'ncc.asia';

export const MEZON_IMAGE_URL =
  'https://cdn.mezon.vn/1837043892743049216/1840654271217930240/1827994776956309500/857_0246x0w.webp';

export const MEZON_EMBED_FOOTER = {
  text: 'Powered by Mezon',
  icon_url: MEZON_IMAGE_URL,
};

export enum EUserType {
  DISCORD = 'DISCORD',
  MEZON = 'MEZON',
}

export enum BetStatus {
  WIN = 'WIN',
  LOSE = 'LOSE',
  CANCEL = 'CANCEL',
}

export enum EMessageMode {
  CHANNEL_MESSAGE = 2,
  DM_MESSAGE = 4,
  THREAD_MESSAGE = 6,
}

export enum FileType {
  NCC8 = 'ncc8',
  FILM = 'film',
  AUDIOBOOK = 'audioBook',
  MUSIC = 'music',
}

export enum FFmpegImagePath {
  NCC8 = '/dist/public/images/ncc8.png',
  AUDIOBOOK = '/dist/public/images/audiobook.png',
}

export enum ErrorSocketType {
  TIME_OUT = 'The socket timed out while waiting for a response.',
  NOT_ESTABLISHED = 'Socket connection has not been established yet.',
}

export enum DynamicCommandType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
}

export interface EmbedProps {
  color?: string;
  title?: string;
  url?: string;
  author?: {
    name: string;
    icon_url?: string;
    url?: string;
  };
  description?: string;
  thumbnail?: { url: string };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
    options?: any[];
    inputs?: {};
  }>;
  image?: { url: string };
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
}

export enum EUnlockTimeSheet {
  PM = 'PM',
  STAFF = 'STAFF',
  CONFIRM = 'CONFIRM',
  CANCEL = 'CANCEL',
  SUBMIT = 'SUBMIT',
}

export enum EUnlockTimeSheetPayment {
  PM_PAYMENT = 50000,
  STAFF_PAYMENT = 20000,
}

export enum EMessageSelectType {
  TEXT = 1,
  USER = 2,
  ROLE = 3,
  CHANNEL = 4,
}

export enum ERequestAbsenceDayStatus {
  CONFIRM = 'CONFIRM',
  CANCEL = 'CANCEL',
}

export enum ERequestAbsenceType {
  OFF = 0,
  ONSITE = 1,
  REMOTE = 2,
}
export enum ERequestAbsenceDateType {
  FULL_DAY = 1,
  MORNING = 2,
  AFTERNOON = 3,
  CUSTOM = 4,
}

export enum ERequestAbsenceTime {
  ARRIVE_LATE = 1,
  MIDDLE_OF_DAY = 2,
  LEAVE_EARLY = 3,
}

export enum EMessageComponentType {
  BUTTON = 1,
  SELECT = 2,
  INPUT = 3,
  DATEPICKER = 4,
  RADIO = 5,
}

export enum ERequestAbsenceDayType {
  OFF = 'OFF',
  ONSITE = 'ONSITE',
  REMOTE = 'REMOTE',
  OFFCUSTOM = 'OFFCUSTOM',
  HELP = '```' +
  'request remote\n' +
  'command: *request remote\n' +
  '\n' +
  'request off\n' +
  'command: *request off\n' +
  '\n' +
  'request onsite\n' +
  'command: *request onsite\n' +
  '\n' +
  'request Đi muộn/ Về sớm\n' +
  'command: *request offcustom ' +
  '```',
}
export enum ERequestW2Type {
    CHANGEOFFICEREQUEST = 'changeofficerequest',
    DEVICEREQUEST = 'devicerequest',
    OFFICEEQUIPMENTREQUEST = 'officeequipmentrequest',
    PROBATIONARYCONFIRMATIONREQUEST = 'probationaryconfirmationrequest',
    WFHREQUEST = 'wfhrequest',
    HELP = '```' +
    'Change Office Request\n' +
    'command: *w2 changeofficerequest\n' +
    '\n' +
    'Device Request\n' +
    'command: *w2 devicerequest\n' +
    '\n' +
    'Office Equipment Request\n' +
    'command: *w2 officeequipmentrequest\n' +
    '\n' +
    'Probationary Confirmation Request\n' +
    'command: *w2 probationaryconfirmationrequest\n' +
    '\n' +
    'WFH Request\n' +
    'command: *w2 wfhrequest ' +
    '```',
  }