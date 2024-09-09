
import fs from 'fs';

export const readFileInLinesByBytes = async (filePath, fileSize, start, end, incompleteReadLines) => {

    return new Promise((resolve, reject) => {

        const stream = fs.createReadStream(filePath, { start, end, encoding: 'utf8' });

        let buffer = '';      // Buffer to accumulate data
        let lineCount = 0;    // Keep track of the number of lines
        let linesBuffer = []; // Array to store lines in the current chunk

        // Handle the data stream
        stream.on('data', (chunk) => {
            if (end <= fileSize && incompleteReadLines) buffer += incompleteReadLines;
            buffer += chunk; // Append the chunk to the buffer

            // Split the buffer into lines
            let lines = buffer.split('\n');
            //   const linesLoopCount = end >= fileSize ? lines.length : lines.length - 1;
            const linesLoopCount = lines.length - 1;

            // Process each complete line
            for (let i = 0; i < linesLoopCount; i++) {
                linesBuffer.push(lines[i]);
                lineCount++;

                // if (lineCount === CHUNK_LINE_SIZE) {
                //     linesBuffer = [];  // Reset the lines buffer
                //     lineCount = 0;     // Reset the line count
                // }
            }

            // Keep any remaining incomplete line in the buffer
            buffer = lines[lines.length - 1];
        });

        // Handle the end of the file
        stream.on('end', () => {
            resolve({ lines: linesBuffer, incompleteReadLines: buffer });
        });

        // Handle any errors
        stream.on('error', (err) => {
            console.error('Error reading the file:', err);
            reject();
        });
    });

}