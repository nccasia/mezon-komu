// src/services/axios-client.service.ts
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

@Injectable()
export class AxiosClientService {
  private axiosInstance: AxiosInstance;

  constructor() {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    this.axiosInstance = axios.create({
      httpsAgent,
      headers: {
        'X-Secret-Key': process.env.WFH_API_KEY_SECRET,
        'Content-Type': 'application/json',
      },
    });
    this.axiosInstance;
  }

  public getInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  async get(url: string, params?: any) {
    try {
      return await this.axiosInstance.get(url, { params });
    } catch (error) {
      throw error;
    }
  }

  async post(url: string, data?: any) {
    try {
      return await this.axiosInstance.post(url, data);
    } catch (error) {
      throw error;
    }
  }

  async delete(url: string, params?: any) {
    try {
      return await this.axiosInstance.delete(url, { params });
    } catch (error) {
      throw error;
    }
  }
}
