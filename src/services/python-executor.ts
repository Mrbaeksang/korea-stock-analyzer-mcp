/**
 * Python 코드 실행 헬퍼
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PythonExecutor {
  /**
   * Python 코드를 실행하고 JSON 결과를 반환
   */
  static async execute(pythonCode: string): Promise<any> {
    try {
      // UTF-8 인코딩 설정 추가
      const wrappedCode = `
import sys
import json
sys.stdout.reconfigure(encoding='utf-8')
${pythonCode}
`;
      
      // Windows에서 작동하도록 파일로 저장 후 실행
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `mcp_python_${Date.now()}.py`);
      
      // BOM 없이 UTF-8로 저장
      fs.writeFileSync(tempFile, wrappedCode, { encoding: 'utf8', flag: 'w' });
      
      const { stdout, stderr } = await execAsync(
        `python "${tempFile}"`,
        {
          encoding: 'utf8',
          maxBuffer: 1024 * 1024 * 10, // 10MB
          timeout: 15000, // 15초 타임아웃
        }
      );
      
      // 임시 파일 삭제
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // 삭제 실패 무시
      }
      
      if (stderr && !stderr.includes('UserWarning') && !stderr.includes('pkg_resources')) {
        console.error('Python warning:', stderr);
      }
      
      // JSON 파싱 전에 출력 정리
      const cleanOutput = stdout.trim();
      if (!cleanOutput) {
        throw new Error('Python 스크립트가 아무것도 출력하지 않았습니다');
      }
      
      return JSON.parse(cleanOutput);
    } catch (error: any) {
      console.error('Python execution error:', error);
      throw new Error(`Python 실행 실패: ${error.message}`);
    }
  }

  /**
   * Python 스크립트 파일 실행
   */
  static async executeFile(scriptPath: string, args: string[] = []): Promise<any> {
    try {
      const command = `python ${scriptPath} ${args.join(' ')}`;
      const { stdout, stderr } = await execAsync(command, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10,
      });
      
      if (stderr) {
        console.error('Python warning:', stderr);
      }
      
      return JSON.parse(stdout);
    } catch (error: any) {
      console.error('Python script execution error:', error);
      throw new Error(`Python 스크립트 실행 실패: ${error.message}`);
    }
  }
}