import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should describe the active providers', () => {
      expect(appController.getHello()).toEqual({
        name: 'case-gen_api',
        auth: 'disabled',
        database: 'in-memory',
        ai: 'groq',
      });
    });
  });
});
