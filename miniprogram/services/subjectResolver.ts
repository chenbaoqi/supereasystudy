// 学科解析（多科支持）：由「册次 id」反查所属学科——册次→教材→学习路径→学科。
// 学习 tab / 游戏中心据此判断当前学科，避免写死 subjects.find(open) 单科假设。
import { semesterRepository } from '../repositories/semesterRepository';
import { textbookRepository } from '../repositories/textbookRepository';
import { learningPathRepository } from '../repositories/learningPathRepository';
import { subjectRepository } from '../repositories/subjectRepository';

export interface ResolvedSubject {
  readonly subjectId: string;
  readonly subjectName: string;
}

// 学科名清单（供 AI 辅导页的「学科切换 chip」使用，数据驱动，不写死学科）。
// 拉取失败时返回空数组，调用方据此隐藏 chip —— 自由问答本身不依赖它。
export async function listSubjectNames(): Promise<string[]> {
  const subjects = await subjectRepository.listAll();
  return subjects.map((item) => item.name).filter((name): name is string => !!name);
}

export async function resolveSubjectOfSemester(
  semesterId: string,
): Promise<ResolvedSubject | null> {
  if (!semesterId) return null;
  const semester = await semesterRepository.getById(semesterId);
  if (!semester) return null;
  const textbook = await textbookRepository.findById(semester.textbookId);
  if (!textbook) return null;
  const path = await learningPathRepository.getById(textbook.learningPathId);
  if (!path) return null;
  const subjects = await subjectRepository.listAll();
  const subject = subjects.find((item) => item._id === path.subjectId);
  if (!subject) return null;
  return { subjectId: subject._id, subjectName: subject.name };
}
