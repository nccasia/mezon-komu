import {
  ChannelMessage,
  EButtonMessageStyle,
  EMessageComponentType,
  MezonClient,
} from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { CommandMessage } from '../../abstracts/command.abstract';
import { InjectRepository } from '@nestjs/typeorm';
import { User, W2Requests } from 'src/bot/models';
import { Repository } from 'typeorm';
import {
  EmbedProps,
  ERequestW2Type,
  MEZON_EMBED_FOOTER,
} from 'src/bot/constants/configs';
import { MezonClientService } from 'src/mezon/services/client.service';
import { getRandomColor } from 'src/bot/utils/helper';
import axios from 'axios';
const https = require('https');

@Command('w2')
export class W2RequestCommand extends CommandMessage {
  private client: MezonClient;
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private clientService: MezonClientService,
    @InjectRepository(W2Requests)
    private w2RequestsRepository: Repository<W2Requests>,
  ) {
    super();
    this.client = this.clientService.getClient();
  }

  async execute(args: string[], message: ChannelMessage) {
    const typeRequest = args[0];
    if (!typeRequest) return;
    
    const typeRequestDayEnum = ERequestW2Type[typeRequest.toUpperCase() as keyof typeof ERequestW2Type];
    if (!typeRequestDayEnum) return;
    if (typeRequestDayEnum === ERequestW2Type.HELP){
        return this.replyMessageGenerate(
          {
            messageContent: ERequestW2Type.HELP,
            mk: [{ type: 't', s: 0, e: ERequestW2Type.HELP.length }],
          },
          message,
        );
      }
    
    const baseUrl = process.env.W2_REQUEST_API_BASE_URL;    
      let keyword = '';
      switch (typeRequestDayEnum) {
        case ERequestW2Type.CHANGEOFFICEREQUEST:
          keyword = 'changeofficerequest';
          break;
        case ERequestW2Type.DEVICEREQUEST:
          keyword = 'devicerequest';
          break;
        case ERequestW2Type.OFFICEEQUIPMENTREQUEST:
          keyword = 'officeequipmentrequest';
          break;
        case ERequestW2Type.PROBATIONARYCONFIRMATIONREQUEST:
            keyword = 'probationaryconfirmationrequest';
            break;
        case ERequestW2Type.WFHREQUEST:
            keyword = 'wfhrequest';
          break;
        default:
          return this.replyMessageGenerate(
            {
              messageContent: 'Invalid command type',
              mk: [{ type: 't', s: 0, e: 'Invalid command type'.length }],
            },
            message,
          );
      }      
    const body = {
      keyword: keyword,
      email: `${message.username}@ncc.asia`,
    };
    let data;
    const agent = new https.Agent({  
        rejectUnauthorized: false
      });
      
      try {
        data = await axios.post(
          `${baseUrl}/list-property-definitions-by-command`,
          body,
          {
            headers: {
              'x-secret-key': process.env.W2_REQUEST_X_SECRET_KEY,
            },
            httpsAgent: agent,
          },
        );
      } catch (error) {
        console.error('Error sending form data:', error);
      }

    function convertToObject(input) {
      if (Array.isArray(input)) {
        return input?.map(convertToObject);
      } else if (typeof input === 'object' && input !== null) {
        return Object.entries(input).reduce((acc, [key, value]) => {
          acc[key] = convertToObject(value);
          return acc;
        }, {});
      }
      return input;
    }

    function extractInputIds() {
      let ids = [];
      data?.data?.embed?.forEach((field) => {
        if (field.inputs?.id) {
          ids.push(field.inputs.id);
        }
      });
      return ids;
    }

    const result = convertToObject(data?.data?.embed);

    const embed: EmbedProps[] = [
      {
        color: getRandomColor(),
        title: `Form Request W2`,
        author: {
          name: message.username,
          icon_url: message.avatar,
          url: message.avatar,
        },
        fields: [...result?.map((item) => item)],
        timestamp: new Date().toISOString(),
        footer: MEZON_EMBED_FOOTER,
      },
    ];

    const components = [
      {
        components: [
          {
            id: 'request_W2_CANCEL',
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Cancel`,
              style: EButtonMessageStyle.SECONDARY,
            },
          },
          {
            id: 'request_W2_CONFIRM',
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Confirm`,
              style: EButtonMessageStyle.SUCCESS,
            },
          },
        ],
      },
    ];

    const dataSend = this.replyMessageGenerate(
      {
        embed,
        components,
      },
      message,
    );
    const response = await this.clientService.sendMessage(dataSend);
    const dataInsert = new W2Requests();
    dataInsert.messageId = response.message_id;
    dataInsert.userId = message.sender_id;
    dataInsert.clanId = message.clan_id;
    dataInsert.channelId = message.channel_id;
    dataInsert.modeMessage = message.mode;
    dataInsert.isChannelPublic = message.is_public;
    dataInsert.createdAt = Date.now();
    dataInsert.workflowId = data?.data?.workflowDefinitionId;
    dataInsert.email = message.username;
    dataInsert.Id = extractInputIds();
    await this.w2RequestsRepository.save(dataInsert);
    return null;
  }
}
