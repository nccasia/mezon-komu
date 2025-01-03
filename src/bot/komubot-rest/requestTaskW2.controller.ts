import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { KomuService } from '../services/komu.services';
import {
  EmbedProps,
  EPMTaskW2Type,
  EUserType,
  MEZON_EMBED_FOOTER,
} from '../constants/configs';
import { EButtonMessageStyle, EMessageComponentType } from 'mezon-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../models';
import { Repository } from 'typeorm';
import { getRandomColor } from '../utils/helper';
@Controller('sendW2TaskToUser')
export class RequestTaskW2Controller {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly komuService: KomuService,
  ) {}
  @Post()
  @ApiResponse({ status: 200, description: 'Message sent successfully.' })
  @ApiResponse({ status: 400, description: 'Error while sending message.' })
  async sendWFHRequest(
    @Body() userRequestDto,
    @Headers('x-secret-key') secretKey: string,
  ) {
    console.log('userRequestDto', userRequestDto);

    let data = [];
    switch (userRequestDto.task.Tasks.Name) {
      case EPMTaskW2Type.CHANGEOFFICE:
        data = [
          {
            name: 'Current Office',
            value: userRequestDto.task.Input.Request.CurrentOffice,
            inline: true,
          },
          {
            name: 'Destination Office',
            value: userRequestDto.task.Input.Request.DestinationOffice,
            inline: true,
          },
          {
            name: 'Content',
            value: userRequestDto.task.Input.Request.Content,
            inline: true,
          },
          {
            name: 'Start Date',
            value: userRequestDto.task.Input.Request.StartDate,
            inline: true,
          },
          {
            name: 'End Date',
            value: userRequestDto.task.Input.Request.EndDate,
            inline: true,
          },
        ];
        break;
      case EPMTaskW2Type.ADVANCEPAYMENT:
        data = [
          {
            name: 'Amount Of Money',
            value: userRequestDto.task.Input.Request.AmountOfMoney,
            inline: true,
          },
          {
            name: 'Reason',
            value: userRequestDto.task.Input.Request.Reason,
            inline: true,
          },
          {
            name: 'Start Day',
            value: userRequestDto.task.Input.Request.StartDay,
            inline: true,
          },
        ];
        break;
      case EPMTaskW2Type.OFFICEEQUIPMENT:
        data = [
          {
            name: 'Current Office',
            value: userRequestDto.task.Input.Request.CurrentOffice,
            inline: true,
          },
          {
            name: 'Equipment',
            value: userRequestDto.task.Input.Request.Equipment,
            inline: true,
          },
          {
            name: 'Reason',
            value: userRequestDto.task.Input.Request.Reason,
            inline: true,
          },
        ];
        break;
      case EPMTaskW2Type.DEVICE:
        data = [
          {
            name: 'Current Office',
            value: userRequestDto.task.Input.Request.CurrentOffice,
            inline: true,
          },
          {
            name: 'Project',
            value: userRequestDto.task.Input.Request.Project,
            inline: true,
          },
          {
            name: 'Device',
            value: userRequestDto.task.Input.Request.Device,
            inline: true,
          },
          {
            name: 'Reason',
            value: userRequestDto.task.Input.Request.Reason,
            inline: true,
          },
        ];
        break;
      case EPMTaskW2Type.PROBATIONARYCONFIRMATION:
        data = [
          {
            name: 'Staff',
            value: userRequestDto.task.Input.Request.Staff,
            inline: true,
          },
          {
            name: 'Current Office',
            value: userRequestDto.task.Input.Request.CurrentOffice,
            inline: true,
          },
          {
            name: 'Project',
            value: userRequestDto.task.Input.Request.Project,
            inline: true,
          },
          {
            name: 'Content',
            value: userRequestDto.task.Input.Request.Content,
            inline: true,
          },
          {
            name: 'Start Date',
            value: userRequestDto.task.Input.Request.StartDate,
            inline: true,
          },
          {
            name: 'End Date',
            value: userRequestDto.task.Input.Request.EndDate,
            inline: true,
          },
        ];
        break;
      case EPMTaskW2Type.RESIGNATION:
        data = [
          {
            name: 'Desired Last Working Day',
            value: userRequestDto.task.Input.Request.DesiredLastWorkingDay,
            inline: true,
          },
          {
            name: 'Reason',
            value: userRequestDto.task.Input.Request.Reason,
            inline: true,
          },
        ];
        break;
      case EPMTaskW2Type.UNLOCKTIMESHEET:
        data = [
          {
            name: 'Time Unlock',
            value: userRequestDto.task.Input.Request.TimeUnlock,
            inline: true,
          },
          {
            name: 'Reason',
            value: userRequestDto.task.Input.Request.Reason,
            inline: true,
          },
        ];
        break;
      case EPMTaskW2Type.WFH:
        data = [
          {
            name: 'Project',
            value: userRequestDto?.task.Input?.Request.Project,
            inline: true,
          },
          {
            name: 'Current Office',
            value: userRequestDto.task.Input.Request.CurrentOffice,
            inline: true,
          },
          {
            name: 'Reason',
            value: userRequestDto.task.Input.Request.Reason,
            inline: true,
          },
          {
            name: 'Dates',
            value: userRequestDto.task.Input.Request.Dates,
            inline: true,
          },
        ];
        break;
      default:
        throw new Error(`Unknown request type}`);
    }

    const EXPECTED_SECRET_KEY = process.env.W2_TASK_X_SECRET_KEY;
    if (!secretKey || secretKey !== EXPECTED_SECRET_KEY) {
      throw new HttpException(
        'Unauthorized: Invalid secret key.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const findUser = await this.userRepository.findOne({
      where: { username: 'huy.nguyenanh', user_type: EUserType.MEZON },
    });

    const requestFields = data.map((req) => ({
      name: req.name,
      value: req.value,
      inline: req.inline,
    }));
    const msg = '!';
    const components = [
      {
        components: [
          {
            id: `Reject_${userRequestDto?.task?.Tasks.Name}_${new Date(userRequestDto?.task?.Tasks.CreationTime).toLocaleDateString('vi-VN')}_${userRequestDto.task.Tasks.Id}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Reject`,
              style: EButtonMessageStyle.SECONDARY,
            },
          },
          {
            id: `Approve_${userRequestDto?.task?.Tasks.Name}_${new Date(userRequestDto?.task.Tasks.CreationTime).toLocaleDateString('vi-VN')}_${userRequestDto.task.Tasks.Id}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: `Approve`,
              style: EButtonMessageStyle.SUCCESS,
            },
          },
        ],
      },
    ];

    const embed: EmbedProps[] = [
      {
        color: getRandomColor(),
        title: `${userRequestDto?.task.Tasks.Name} - ${new Date(userRequestDto?.task.Tasks.CreationTime).toLocaleDateString('vi-VN')}`,
        fields: [
          {
            name: 'REQUEST INPUT:',
            value: '',
          },
          ...requestFields,
          {
            name: 'REQUEST USER:',
            value: '',
          },
          {
            name: 'Name',
            value: userRequestDto?.task.Input.RequestUser.Name,
            inline: true,
          },
          {
            name: 'Email',
            value: userRequestDto?.task.Input.RequestUser.Email,
            inline: true,
          },
          {
            name: 'Branch name',
            value: userRequestDto?.task.Input.RequestUser.BranchName,
            inline: true,
          },
          {
            name: 'DETAILS:',
            value: '',
          },
          {
            name: 'Email assignment',
            value: userRequestDto?.task?.EmailTo.join(', '),
            inline: true,
          },
          {
            name: 'Request template',
            value: userRequestDto?.task?.Tasks.Name,
            inline: true,
          },
          {
            name: 'Status',
            value: 'Pending',
            inline: true,
          },

          {
            name: 'Creation time',
            value: new Date(
              userRequestDto?.task.Tasks?.CreationTime,
            ).toLocaleDateString('vi-VN'),
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: MEZON_EMBED_FOOTER,
      },
    ];

    try {
      await this.komuService.sendMessageKomuToUser(
        msg,
        findUser.userId,
        true,
        false,
        components,
        embed,
      );
    } catch (error) {
      console.error(
        `${findUser.userId}`,
        error,
      );
    }
  }
}
