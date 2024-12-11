import { Injectable } from '@nestjs/common';
import { ApiUrl } from '../constants/api_url';
import { normalizeString } from '../utils/helper';
import parseDuration from 'parse-duration';
import * as chrono from 'chrono-node';
import { AxiosClientService } from './axiosClient.services';
import { UtilsService } from './utils.services';
import { ClientConfigService } from '../config/client-config.service';
import { User } from '../models/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Daily } from '../models/daily.entity';
import { EUserType } from '../constants/configs';

@Injectable()
export class TimeSheetService {
  constructor(
    private readonly axiosClientService: AxiosClientService,
    private utilsService: UtilsService,
    private clientConfigService: ClientConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Daily)
    private dailyRepository: Repository<Daily>,
  ) {}

  async findWFHUser(timestamp?: number) {
    const url = `${ApiUrl.WFHApi.api_url}?date=${new Date(timestamp || Date.now()).toDateString()}`;
    const response = await this.axiosClientService.get(url);
    if (response.status == 200) {
      const wfhResult = response.data;
      return wfhResult?.['result'] ? wfhResult['result'] : [];
    }

    return [];
  }

  parseDailyMessage = (message) => {
    const [, metaRaw, yesterday, todayRaw, block] = message.split(
      new RegExp('\\*daily|[- ]?yesterday:|[- ]?today:|[- ]?block:', 'ig'),
    );
    const [projectRaw, dateRaw] = metaRaw.trim().split(/\s+/);
    const dateStr = dateRaw
      ? normalizeString(dateRaw)
      : normalizeString(projectRaw);
    const projectCode = dateRaw ? normalizeString(projectRaw) : null;
    const todayStr = normalizeString(todayRaw);
    const date = chrono.parseDate(dateStr);
    const tasks = this.parseTimeSheetSentence(todayStr);
    const contentObj = {
      date: dateStr,
      projectCode,
      timeStamp: date,
      yesterday: normalizeString(yesterday),
      today: todayStr,
      block: normalizeString(block),
      tasks,
    };
    return contentObj;
  };

  logTimeSheetForTask = async (
    note,
    emailAddress,
    projectCode,
    typeOfWork,
    taskName,
    hour,
  ) => {
    const timesheetPayload = {
      note,
      emailAddress,
      projectCode,
      typeOfWork,
      taskName,
      hour,
    };
    const url =
      !hour || !projectCode
        ? `${process.env.TIMESHEET_API}MyTimesheets/CreateByKomu`
        : `${process.env.TIMESHEET_API}MyTimesheets/CreateFullByKomu`;

    const response = await this.axiosClientService.post(url, timesheetPayload, {
      headers: {
        'X-Secret-Key': process.env.DAILY_TO_TIMESHEET,
      },
    });
    return response;
  };

  parseTimeSheetTask = (chunk) => {
    const [note, meta] = (chunk || '').split(';');
    const [timeRaw, type, name] = (meta || '').split(',');
    const time = normalizeString(timeRaw);
    const duration = parseDuration(time);
    const task = {
      note: normalizeString(note),
      time: time,
      duration: duration,
      type: normalizeString(type),
      name: normalizeString(name),
    };
    return task;
  };

  parseTimeSheetSentence = (sentence) => {
    const chunks = sentence.split(new RegExp('\\+', 'ig'));
    const items = chunks
      .filter((chunk) => chunk.trim())
      .map((chunk) => this.parseTimeSheetTask(chunk));
    return items;
  };

  async getUserOffWork(date?) {
    let userOffFullday = [];
    let userOffMorning = [];
    let userOffAfternoon = [];

    const url = date
      ? `${process.env.TIMESHEET_API}Public/GetAllUserLeaveDay?date=${date.toDateString()}`
      : `${process.env.TIMESHEET_API}Public/GetAllUserLeaveDay`;

    const response = await this.axiosClientService.get(url);

    if ((response as any).data && (response as any).data.result) {
      userOffFullday = (response as any).data.result
        .filter((user) => user.message.includes('Off Fullday'))
        .map((item) => item.emailAddress.replace('@ncc.asia', ''));
      userOffMorning = (response as any).data.result
        .filter((user) => user.message.includes('Off Morning'))
        .map((item) => item.emailAddress.replace('@ncc.asia', ''));
      userOffAfternoon = (response as any).data.result
        .filter((user) => user.message.includes('Off Afternoon'))
        .map((item) => item.emailAddress.replace('@ncc.asia', ''));
    }

    const notSendUser =
      this.getStatusDay() === 'Morning'
        ? [...userOffFullday, ...userOffMorning]
        : [...userOffFullday, ...userOffAfternoon];

    return { notSendUser, userOffFullday, userOffMorning, userOffAfternoon };
  }

  getStatusDay() {
    let statusDay;
    const date = new Date();
    const timezone = date.getTimezoneOffset() / -60;
    const hour = date.getHours();
    if (hour < 5 + timezone) {
      statusDay = 'Morning';
    } else if (hour < 11 + timezone) {
      statusDay = 'Afternoon';
    }
    return statusDay;
  }

  async getUserNotDaily(date: Date) {
    if (
      date &&
      (date.getDay() === 0 || date.getDay() === 6 || date > new Date())
    ) {
      return {
        notDaily: [],
        userNotDaily: [],
        notDailyMorning: [],
        notDailyFullday: [],
        notDailyAfternoon: [],
      };
    }

    try {
      let wfhGetApi;
      try {
        const url = date
          ? `${
              this.clientConfigService.wfh.api_url
            }?date=${date.toDateString()}`
          : this.clientConfigService.wfh.api_url;
        wfhGetApi = await this.axiosClientService.get(url, {
          httpsAgent: this.clientConfigService.https,
          headers: {
            // WFH_API_KEY_SECRET
            securitycode: this.clientConfigService.wfhApiKey,
          },
        });
      } catch (error) {
        console.log(error);
      }
      if (!wfhGetApi || wfhGetApi.data == undefined) {
        return;
      }
      let wfhMorning = [];
      let wfhAfternoon = [];
      let wfhFullday = [];
      let wfhUserEmail = [];
      if (wfhGetApi && wfhGetApi.data && wfhGetApi.data.result.length > 0) {
        wfhUserEmail = wfhGetApi.data.result.map((item) =>
          this.utilsService.getUserNameByEmail(item.emailAddress),
        );

        wfhMorning = wfhGetApi.data.result
          .filter((item) => item.dateTypeName === 'Morning')
          .map((item) =>
            this.utilsService.getUserNameByEmail(item.emailAddress),
          );

        wfhAfternoon = wfhGetApi.data.result
          .filter((item) => item.dateTypeName === 'Afternoon')
          .map((item) =>
            this.utilsService.getUserNameByEmail(item.emailAddress),
          );

        wfhFullday = wfhGetApi.data.result
          .filter((item) => item.dateTypeName === 'Fullday')
          .map((item) =>
            this.utilsService.getUserNameByEmail(item.emailAddress),
          );

        // if no wfh
        if (
          (Array.isArray(wfhUserEmail) && wfhUserEmail.length === 0) ||
          !wfhUserEmail
        ) {
          return;
        }
      }

      const { userOffFullday } = await this.getUserOffWork(date);
      const userOff = [...wfhUserEmail, ...userOffFullday];
      const userNotWFH = await this.userRepository
        .createQueryBuilder('user')
        .where(
          userOff && userOff.length
            ? 'LOWER("email") NOT IN (:...userOff)'
            : 'true',
          {
            userOff: userOff,
          },
        )
        .andWhere('("createdAt" < :today OR "createdAt" is NULL)', {
          today: Date.now() - 86400 * 1000,
        })
        .andWhere('user_type = :userType', { userType: EUserType.MEZON })
        .andWhere(`"deactive" IS NOT TRUE`)
        .select('*')
        .execute();

      const userEmail = userNotWFH.map((item) => item.email);

      const dailyMorning = await this.dailyRepository
        .createQueryBuilder()
        .where(`"createdAt" >= :gtecreatedAt`, {
          gtecreatedAt: this.utilsService.getDateDay(date).morning.firstTime,
        })
        .andWhere(`"createdAt" <= :ltecreatedAt`, {
          ltecreatedAt: this.utilsService.getDateDay(date).morning.lastTime,
        })
        .select('*')
        .execute();

      const dailyAfternoon = await this.dailyRepository
        .createQueryBuilder()
        .where(`"createdAt" >= :gtecreatedAt`, {
          gtecreatedAt: this.utilsService.getDateDay(date).afternoon.firstTime,
        })
        .andWhere(`"createdAt" <= :ltecreatedAt`, {
          ltecreatedAt: this.utilsService.getDateDay(date).afternoon.lastTime,
        })
        .select('*')
        .execute();

      const dailyFullday = await this.dailyRepository
        .createQueryBuilder()
        .where(`"createdAt" >= :gtecreatedAt`, {
          gtecreatedAt: this.utilsService.getDateDay(date).fullday.firstTime,
        })
        .andWhere(`"createdAt" <= :ltecreatedAt`, {
          ltecreatedAt: this.utilsService.getDateDay(date).fullday.lastTime,
        })
        .select('*')
        .execute();

      const dailyEmailMorning = dailyMorning.map((item) =>
        item.email.toLowerCase(),
      );
      const dailyEmailAfternoon = dailyAfternoon.map((item) =>
        item.email.toLowerCase(),
      );
      const dailyEmailFullday = dailyFullday.map((item) =>
        item.email.toLowerCase(),
      );

      const notDailyMorning = [];
      for (const wfhData of wfhUserEmail) {
        if (wfhMorning.includes(wfhData) || wfhFullday.includes(wfhData)) {
          if (
            !dailyEmailMorning.includes(wfhData.toLowerCase()) &&
            wfhData !== undefined
          ) {
            notDailyMorning.push(wfhData);
          }
        }
      }

      const notDailyAfternoon = [];
      for (const wfhData of wfhUserEmail) {
        if (wfhAfternoon.includes(wfhData) || wfhFullday.includes(wfhData)) {
          if (
            !dailyEmailAfternoon.includes(wfhData.toLowerCase()) &&
            wfhData !== undefined
          ) {
            notDailyAfternoon.push(wfhData);
          }
        }
      }

      const notDailyFullday = [];
      for (const userNotWFHData of userEmail) {
        if (
          !dailyEmailFullday.includes(userNotWFHData.toLowerCase()) &&
          userNotWFHData !== undefined
        ) {
          notDailyFullday.push(userNotWFHData);
        }
      }

      const spreadNotDaily = [
        ...notDailyMorning,
        ...notDailyAfternoon,
        ...notDailyFullday,
      ];
      // => notDaily : {email : "", count : }
      const notDaily = spreadNotDaily.reduce((acc, cur) => {
        if (Array.isArray(acc) && acc.length === 0) {
          acc.push({ email: cur, count: 1 });
        } else {
          const indexExist = acc.findIndex((item) => item.email === cur);
          if (indexExist !== -1) {
            acc[indexExist] = {
              email: acc[indexExist].email,
              count: acc[indexExist].count + 1,
            };
          } else {
            acc.push({ email: cur, count: 1 });
          }
        }
        return acc;
      }, []);

      let userNotDaily;
      const dayToMilliseconds = 86400 * 1000;
      try {
        userNotDaily = await Promise.all(
          notDaily.map((user) =>
            this.userRepository
              .createQueryBuilder('user')
              .where(
                `(LOWER("email") = :email or LOWER("username") = :username)`,
                {
                  email: user.email.toLowerCase(),
                  username: user.email.toLowerCase(),
                },
              )
              .andWhere('("createdAt" < :today OR "createdAt" is NULL)', {
                today: Date.now() - dayToMilliseconds,
              })
              .andWhere('user_type = :userType', { userType: EUserType.MEZON })
              .andWhere(`"deactive" IS NOT TRUE`)
              .select('*')
              .getRawOne(),
          ),
        );
      } catch (error) {
        console.log(error);
      }

      for (let i = 0; i < userNotDaily.length; i++) {
        if (userNotDaily[i] === null) {
          userNotDaily[i] = notDaily[i];
        }
      }
      return {
        notDaily,
        userNotDaily,
        notDailyMorning,
        notDailyFullday,
        notDailyAfternoon,
      };
    } catch (error) {
      console.log(error);
    }
  }

  requestAbsenceDay = async (body) => {
    // Call API request absence day
    const resAbsenceDayRequest = await this.axiosClientService.post(
      `${this.clientConfigService.absenceDayRequestApi.api_url}`,
      body,
      {
        httpsAgent: this.clientConfigService.https,
        headers: {
          securityCode: this.clientConfigService.imsKeySecret,
        },
      },
    );
    return resAbsenceDayRequest;
  };

  getAllTypeAbsence = async () => {
    try {
      const absenceType = await this.axiosClientService.get(
        `${this.clientConfigService.absenceTypeApi.api_url}`,
        {
          httpsAgent: this.clientConfigService.https,
          headers: {
            securityCode: this.clientConfigService.imsKeySecret,
          },
        },
      );
      return absenceType;
    } catch (error) {
      console.log(error);
    }
  };
}
