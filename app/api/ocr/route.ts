import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Save the uploaded file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempFilePath = join(tmpdir(), `ocr-${Date.now()}.png`);
    await writeFile(tempFilePath, buffer);

    // Run EasyOCR
    const result = await new Promise((resolve, reject) => {
const pythonProcess = spawn('python', [
  '-c',
  `
import easyocr
import json
import sys

reader = easyocr.Reader(['en'])
result = reader.readtext(r'${tempFilePath}')

def to_native(val):
    if isinstance(val, (list, tuple)):
        return [to_native(x) for x in val]
    try:
        return val.item()
    except AttributeError:
        return val

output = [
    {
        "bbox": to_native(item[0]),
        "text": item[1],
        "confidence": float(item[2])
    }
    for item in result
]

print(json.dumps(output))
`.trim()
]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${error}`));
          return;
        }
        try {
          const parsedOutput = JSON.parse(output);
          resolve(parsedOutput);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${e}`));
        }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
} 