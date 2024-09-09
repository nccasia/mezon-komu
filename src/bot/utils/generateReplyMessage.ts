import { ApiMessageRef, ChannelMessage } from 'mezon-sdk';
import { ReplyMezonMessage } from '../asterisk-commands/dto/replyMessage.dto';

export function replyMessageGenerate(
  replayConent: { [x: string]: any },
  message: ChannelMessage,
): ReplyMezonMessage {
  const replayMessage: ReplyMezonMessage = {} as ReplyMezonMessage;
  const defaultValue = {
    mentions: [],
    attachments: [],
  };
  [
    'clan_id',
    'channel_id',
    'mode',
    'is_public',
    ...Object.keys(defaultValue),
  ].forEach(
    (field) =>
      (replayMessage[field] = fieldGenerate(
        field,
        replayConent,
        message,
        defaultValue,
      )),
  );

  replayMessage['msg'] =
    'messageContent' in replayConent
      ? { t: replayConent['messageContent'] }
      : { t: '' };
  replayMessage['ref'] = refGenerate(message);

  return replayMessage;
}

export function fieldGenerate(
  field: string,
  replayConent,
  message: ChannelMessage,
  defaultValue: { [x: string]: any },
) {
  return field in replayConent
    ? replayConent[field]
    : field in defaultValue
      ? defaultValue[field]
      : message[field];
}

export function refGenerate(msg: ChannelMessage): Array<ApiMessageRef> {
  return [
    {
      message_id: '',
      message_ref_id: msg.message_id,
      ref_type: 0,
      message_sender_id: msg.sender_id,
      message_sender_username: msg.username,
      mesages_sender_avatar: msg.avatar,
      message_sender_clan_nick: msg.clan_nick,
      message_sender_display_name: msg.display_name,
      content: JSON.stringify(msg.content),
      has_attachment: false,
    },
  ];
}