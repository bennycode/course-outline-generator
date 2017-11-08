const fs = require('fs-extra');
const lineReader = require('line-reader');
const MarkdownIt = require('markdown-it');
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
        // Title without links
        contents += line + ' <ul>';
      }
      else if (line.startsWith('- ')) {
        // List item
        contents += `<li>${line.substr('- '.length)}</li>`;
      }
      else if (line.length === 0) {
        // Blank line
        contents += '</ul> ';
      }
      else {
        contents += line + '\r\n';
      }
      if (last) {
        resolve(contents);
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
  let output = '<!-- TITLE: Curriculum Course Contents -->\r\n<!-- SUBTITLE: Course Outline -->\r\n\r\n';
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
      let categoryName = day.substr(day.lastIndexOf(' - ') + ' - '.length);
      categoryName = path.basename(categoryName, '.md');
      
      if (categoryName.endsWith('_')) {
        continue;
      }
      
      ++courseDay;
      
      output += `${courseDay} | ${categoryName} | `;
      output += await renderFileContents(day);
      
      const exercises = day.replace('.md', '_.md');
      if (fs.existsSync(exercises)) {
        output += ' | ' + await renderFileContents(exercises);
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