/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { ChannelMessage } from 'mezon-sdk';
import { EButtonMessageStyle, EMessageComponentType } from 'mezon-sdk';
import { CommandMessage } from '../../abstracts/command.abstract';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Daily, User } from 'src/bot/models';
import { dailyHelp } from './daily.constants';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { TimeSheetService } from 'src/bot/services/timesheet.services';
import {
  extractText,
  findProjectByLabel,
  getRandomColor,
} from 'src/bot/utils/helper';
import { EmbedProps, MEZON_EMBED_FOOTER } from 'src/bot/constants/configs';
import { ClientConfigService } from 'src/bot/config/client-config.service';
import { AxiosClientService } from 'src/bot/services/axiosClient.services';

export enum EMessageSelectType {
  TEXT = 1,
  USER = 2,
  ROLE = 3,
  CHANNEL = 4,
}

@Command('daily')
export class DailyCommand extends CommandMessage {
  constructor(
    private timeSheetService: TimeSheetService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Daily) private dailyRepository: Repository<Daily>,
    private readonly clientConfigService: ClientConfigService,
    private readonly axiosClientService: AxiosClientService,
  ) {
    super();
  }

  validateMessage(args: string[]) {
    if (args[0] === 'help') return dailyHelp;
    const daily = args.join(' ');
    let checkDaily = false;
    const wordInString = (s, word) =>
      new RegExp('\\b' + word + '\\b', 'i').test(s);
    ['yesterday', 'today', 'block'].forEach((q) => {
      if (!wordInString(daily, q)) return (checkDaily = true);
    });

    if (checkDaily) return dailyHelp;

    if (!daily || daily == undefined) {
      return '```please add your daily text```';
    }

    return false;
  }

  async execute(args: string[], message: ChannelMessage) {
    const content = message.content.t;
    const messageid = message.message_id;
    const messageValidate = this.validateMessage(args);
    const clanId = message.clan_id;
    const codeMess = message.code;
    const modeMess = message.mode;
    const isPublic = message.is_public;
    const ownerSenderDaily = message.sender_id;
    const ownerSenderDailyEmail = message.username + '@ncc.asia';
    const onlyDailySyntax =
      message?.content?.t && typeof message.content.t === 'string'
        ? message.content.t.trim() === '*daily'
        : false;
    if (messageValidate && !onlyDailySyntax)
      return this.replyMessageGenerate(
        {
          messageContent: messageValidate,
          mk: [{ type: 't', s: 0, e: messageValidate.length }],
        },
        message,
      );
    const projectText = args[0] ?? '';
    const yesterdayText = extractText(content, 'Yesterday');
    const todayText = extractText(content, 'Today');
    const blockText = extractText(content, 'Block');
    const workingTimeText = extractText(content, 'Working Time') || 1;
    const typeOfWorkText = extractText(content, 'Type Of Work');
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const { project } = this.clientConfigService;
    const httpsAgent = this.clientConfigService.https;
    const pmData = await this.axiosClientService.get(
      `${project.api_url_getListProjectOfUser}?email=${ownerSenderDailyEmail}`,
      {
        httpsAgent,
      },
    );
    const projectMetaData = pmData?.data?.result;
    const optionsProject = projectMetaData?.map((project) => ({
      label: project.projectName,
      value: project.projectCode,
    }));
    const getProjectFromProjectOpt =
      findProjectByLabel(optionsProject, projectText) ||
      optionsProject[projectMetaData.length - 1];
    const urlGetTasks = `${process.env.TIMESHEET_API}Mezon/GetProjectsIncludingTasks?emailAddress=${ownerSenderDailyEmail}`;
    const responseTasks = await this.axiosClientService.get(urlGetTasks, {
      headers: {
        securityCode: process.env.SECURITY_CODE,
        accept: 'application/json',
      },
    });
    const taskMetaData = responseTasks.data.result;
    const getTaskByProjectCode = taskMetaData.find(
      (p) => p.projectCode === getProjectFromProjectOpt.value,
    );
    const optionsTask = getTaskByProjectCode?.tasks?.map((task) => ({
      label: task.taskName,
      value: task.taskName,
    }));
    const metaDataOptions =  taskMetaData.map(project => ({
      projectName: project.projectName,
      projectCode: project.projectCode,
      tasks: project.tasks.map(task => ({
        projectTaskId: task.projectTaskId,
        taskName: task.taskName,
        billable: task.billable,
        isDefault: task.isDefault,
      }))
    }));
    const optionTypeOfWork = [
      {
        label: 'Normal Time',
        value: 0,
      },
      {
        label: 'Overtime',
        value: 1,
      },
    ];

    const getTypeOfWorkFromOpt =
      findProjectByLabel(optionTypeOfWork, typeOfWorkText) ||
      optionTypeOfWork[0];



      

    const embed: EmbedProps[] = [
      {
        color: getRandomColor(),
        title: `Daily On ${formattedDate}`,
        fields: [
          {
            name: 'Project:',
            value: '',
            inputs: {
              id: `daily-${messageid}-project`,
              type: EMessageComponentType.SELECT,
              component: {
                options: optionsProject,
                required: true,
                valueSelected: getProjectFromProjectOpt,
              },
            },
          },
          {
            name: 'Yesterday:',
            value: '',
            inputs: {
              id: `daily-${messageid}-yesterday-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `daily-${messageid}-yesterday-plhder`,
                placeholder: 'Ex. Write something',
                required: true,
                textarea: true,
                defaultValue: yesterdayText,
              },
            },
          },
          {
            name: 'Today:',
            value: '',
            inputs: {
              id: `daily-${messageid}-today-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `daily-${messageid}-today-plhder`,
                placeholder: 'Ex. Write something',
                required: true,
                textarea: true,
                defaultValue: todayText,
              },
            },
          },
          {
            name: 'Block:',
            value: '',
            inputs: {
              id: `daily-${messageid}-block-ip`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `daily-${messageid}-block-plhder`,
                placeholder: 'Ex. Write something',
                required: true,
                textarea: true,
                type: EMessageSelectType.TEXT,
                defaultValue: blockText,
              },
            },
          },
          {
            name: 'Working time:',
            value: '',
            inputs: {
              id: `daily-${messageid}-working-time`,
              type: EMessageComponentType.INPUT,
              component: {
                id: `daily-${messageid}-working-time-plhder`,
                placeholder: 'Ex. Enter Workingtime',
                required: true,
                defaultValue: Number(workingTimeText),
                type: 'number',
              },
            },
          },
          {
            name: 'Task:',
            value: '',
            inputs: {
              id: `daily-${messageid}-task`,
              type: EMessageComponentType.SELECT,
              component: {
                options: optionsTask,
                required: true,
                valueSelected: optionsTask[0],
                metaDataOptions: metaDataOptions
              },
            },
          },
          {
            name: 'Type Of Work:',
            value: '',
            inputs: {
              id: `daily-${messageid}-type-of-work`,
              type: EMessageComponentType.SELECT,
              component: {
                options: optionTypeOfWork,
                required: true,
                valueSelected: getTypeOfWorkFromOpt,
              },
            },
          },
        ],

        timestamp: new Date().toISOString(),
        footer: MEZON_EMBED_FOOTER,
      },
    ];
    const components = [
      {
        components: [
          {
            id: `daily_${messageid}_${clanId}_${modeMess}_${codeMess}_${isPublic}_${ownerSenderDaily}_${formattedDate}_cancel`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Cancel`,
              style: EButtonMessageStyle.SECONDARY,
            },
          },
          {
            id: `daily_${messageid}_${clanId}_${modeMess}_${codeMess}_${isPublic}_${ownerSenderDaily}_${formattedDate}_submit`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Submit`,
              style: EButtonMessageStyle.SUCCESS,
            },
          },
        ],
      },
    ];
    if (onlyDailySyntax || !messageValidate)
      return this.replyMessageGenerate(
        {
          embed,
          components,
        },
        message,
      );
  }
}
