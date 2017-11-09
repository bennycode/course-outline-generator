const fs = require('fs-extra');
const lineReader = require('line-reader');
const md = require('markdown-it')();
const path = require('path');

const rootDir = 'C:\\Users\\bennyn\\Dropbox (Privat)\\Devugees\\course-outline';

// Returns files that start with numbers (like "001", "002", etc.) and are stored within the root directory
courseContent = async () => {
  const files = await fs.readdir(rootDir);
  const directories = files.filter((file) => fs.lstatSync(path.join(rootDir, file)).isDirectory());
  const getFilePaths = directories.map((directory) => {
    return fs.readdir(path.join(rootDir, directory))
      .then((files) => {
        return files
          .filter((file) => {
            const parts = file.split('-');
            return (parts && !isNaN(parseInt(parts[0])));
          })
          .map((file) => path.join(rootDir, directory, file))
      });
  });
  
  return Promise.all(getFilePaths);
};

function renderFileContents(file) {
  let contents = '';
  return new Promise((resolve) => {
    let unclosedList = false;
    lineReader.eachLine(file, (line, last) => {
      if (line.includes('## ')) {
        // Titles
        line = line.substr(line.indexOf('## ') + '## '.length);
        // Title with links
        if (line.startsWith('[')) {
          line = line.replace('[', '[**');
          line = line.replace(']', '**]');
        }
        else {
          line = `**${line}`;
          line += '** ';
        }
      }
      contents += line + '\r\n';
      if (last) {
        resolve(md.render(contents).replace(/(\r\n|\n|\r)/gm, ''));
      }
    });
  });
}

function promiseTest() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('promiseTest');
    }, 5000)
  });
}

async function run() {
  const sections = await courseContent();
  let courseDay = 0;
  let output = '<!-- TITLE: Curriculum Outline -->\r\n<!-- SUBTITLE: Course contents -->\r\n\r\n';
  for (section of sections) {
    if (section.length === 0) {
      continue;
    }
    let heading = path.dirname(section[0]);
    heading = heading.substr(heading.lastIndexOf(' - ') + ' - '.length);
    
    output += `# ${heading}\r\n\r\n`;
    output += `Day | Lecture | Contents | Exercises\r\n`;
    output += `:---:|:---|:---|:---\r\n`;
    
    for (day of section) {
      let categoryName =path.basename(day, '.md');
      categoryName = categoryName.substr(categoryName.indexOf(' - ') + ' - '.length);
      
      if (categoryName.endsWith('_')) {
        continue;
      }
      
      ++courseDay;
      
      output += `${courseDay} | ${categoryName} | `;
      output += await renderFileContents(day);
      
      const exercises = day.replace('.md', '_.md');
      if (fs.existsSync(exercises)) {
        output += ' | ' + await renderFileContents(exercises) + '\r\n';
      } else {
        output += ` | \r\n`;
      }
    }
    
    output += `\r\n`;
  }
  
  fs.outputFile('dist/done.md', output)
    .then(() => console.log('DONE!'))
    .catch(() => console.log('FAIL!'));
}

run();