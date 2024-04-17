import Papa from 'papaparse';
import log from 'electron-log/renderer';

export const parseCSV = (file: File): Promise<string[]> =>
  new Promise((resolve) => {
    log.info('Parsing file...');

    Papa.parse(file, {
      error: ({ name }) => {
        log.error(`Parsing error: ${name}`);
      },
      complete: (results: { data: string[][] }) => {
        log.info('Parsing completed. Filtering empty rows...');

        resolve(results.data.flat().filter((i) => !!i));
      },
    });
  });
