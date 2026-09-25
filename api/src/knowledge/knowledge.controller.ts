import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

@Controller()
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get('concepts')
  listConcepts() {
    return this.knowledge.listConcepts();
  }

  @Post('concepts')
  createConcept(@Body() body: unknown) {
    return this.knowledge.createConcept(body);
  }

  @Get('knowledge-graph')
  getGraph(@Query('studyId') studyId?: string) {
    return this.knowledge.getGraph(studyId);
  }

  @Post('concept-relationships')
  addRelationship(@Body() body: unknown) {
    return this.knowledge.addRelationship(body);
  }

  @Put('studies/:studyId/concepts')
  setStudyConcepts(@Param('studyId') studyId: string, @Body() body: unknown) {
    return this.knowledge.setStudyConcepts(studyId, body);
  }

  @Get('learner/concepts')
  getLearnerStates(@Query('learnerId') learnerId?: string) {
    return this.knowledge.getLearnerStates(learnerId);
  }

  @Post('learning-evidence')
  recordEvidence(@Body() body: unknown) {
    return this.knowledge.recordEvidence(body);
  }

  @Get('misconceptions')
  listMisconceptions(@Query('learnerId') learnerId?: string) {
    return this.knowledge.listMisconceptions(learnerId);
  }

  @Post('misconceptions')
  createMisconception(@Body() body: unknown) {
    return this.knowledge.createMisconception(body);
  }

  @Post('learner/misconceptions')
  recordMisconception(@Body() body: unknown) {
    return this.knowledge.recordMisconception(body);
  }
}
