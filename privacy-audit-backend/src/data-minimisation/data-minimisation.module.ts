import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataMinimisationViolation } from './data-minimisation-violation.entity';
import { DataMinimisationService } from './data-minimisation.service';

@Module({
  imports: [TypeOrmModule.forFeature([DataMinimisationViolation])],
  providers: [DataMinimisationService],
  exports: [DataMinimisationService, TypeOrmModule],
})
export class DataMinimisationModule {}
