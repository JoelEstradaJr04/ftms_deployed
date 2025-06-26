from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import easyocr
import tempfile
import os
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OCR Service",
    description="A service for processing receipt images using OCR",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize EasyOCR reader
try:
    reader = easyocr.Reader(['en'])
    logger.info("EasyOCR initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize EasyOCR: {str(e)}")
    raise

@app.get("/")
async def root():
    return {
        "message": "OCR Service is running",
        "endpoints": {
            "POST /ocr": "Process an image file for OCR"
        }
    }

@app.post("/ocr")
async def process_image(file: UploadFile = File(...)) -> List[Dict[str, Any]]:
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    temp_file = None
    try:
        # Create a temporary file with the correct extension
        file_extension = os.path.splitext(file.filename)[1] if file.filename else '.png'
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
        
        # Write the uploaded file to the temporary file
        content = await file.read()
        temp_file.write(content)
        temp_file.close()  # Close the file before processing
        
        logger.info(f"Processing image: {file.filename}")
        
        # Process with EasyOCR
        result = reader.readtext(temp_file.name)
        
        # Format the result
        formatted_result = [
            {
                "text": text,
                "confidence": float(confidence),  # Ensure confidence is serializable
                "bbox": [[float(x) for x in point] for point in bbox]  # Ensure coordinates are serializable
            }
            for bbox, text, confidence in result
        ]
        
        logger.info(f"Successfully processed image. Found {len(formatted_result)} text elements")
        return formatted_result
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")
        
    finally:
        # Clean up the temporary file
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except Exception as e:
                logger.error(f"Error deleting temporary file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000) 