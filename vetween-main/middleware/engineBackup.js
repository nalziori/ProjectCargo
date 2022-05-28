const { host } = require('../config').s3;

const engine = async (data, type, imageList, next) =>{
  data = data.split('\r\n');
  let pStatus = false;
  let h3Count = 0;
  let h4Count = 0;
  let h5Count = 0;
  let h6Count = 0;
  // Tag
  for (let i = 0; i < data.length; i++) {
    const link = new RegExp(/\[\[([A-z0-9-ㄱ-ㅎㅏ-ㅣ가-힣\s\.]+)\]\]/ig);
    const outlink = new RegExp(/\[\[([A-z0-9-ㄱ-ㅎㅏ-ㅣ가-힣\s\.\(\)]+)\|([A-z0-9-ㄱ-ㅎㅏ-ㅣ가-힣\s\:\.\/\-\=\?\&\%]+)\]\]/ig);
    const image = new RegExp(/\[\[image:(.*)\]\]/ig);
    const key = new RegExp(/\`([A-z0-9-ㄱ-ㅎㅏ-ㅣ가-힣\.\/\\]+)\`/ig);
    const code = new RegExp(/\`\`\`([A-z0-9-ㄱ-ㅎㅏ-ㅣ가-힣\.\/\\\s]+)\`\`\`/ig);
    const highlight = new RegExp(/\"([A-z0-9-ㄱ-ㅎㅏ-ㅣ가-힣\s\.]+)\"/ig);
    const domain = new RegExp(/(?:[A-z0-9ㄱ-ㅎㅏ-ㅣ가-힣](?:[A-z0-9-ㄱ-ㅎㅏ-ㅣ가-힣]{0,61}[A-z0-9ㄱ-ㅎㅏ-ㅣ가-힣])?\.)+[A-z0-9][A-z0-9-]{0,61}[A-z0-9]/ig);
    if (data[i].match(highlight)) { // Highlight
      data[i] = data[i].replace(highlight, '<span class="highlight">"$1"</span>');
    }
    if (data[i].match(image)) { // Image
      let imageId = data[i].replace('[[image:', '');
      imageId = imageId.replace(']]', '');
      const image = imageList.find(i => i.id === imageId);
      if (image) {
        const imageAlt = image.image_path.replace(/\.(?:jpg|gif|png)/ig, '');
        if (type === 'wiki') {
          data[i] = `<img src="${host}/wiki/${image.image_path}" alt="${imageAlt}">`;
        } else if (type === 'news') {
          data[i] = `<img src="${host}/news/${image.image_path}" alt="${imageAlt}">`;
        }
      }
    }
    if (data[i].match(outlink)) { // Outlink
      data[i] = data[i].replace(outlink, '<a href="$2" target="_blank" class="outlink">$1</a>');
    }
    if (data[i].match(link)) { // Link
      let slug = data[i].match(link)[0].replace(/\s/ig, '%20');
      slug = slug.replace('[[', '').replace(']]', '');
      data[i] = data[i].replace(link, `<a href="/w/${slug}">$1</a>`);
    }
    if (data[i].match(code)) { // Key
      data[i] = data[i].replace(code, '<span class="code">$1</span>');
    }
    if (data[i].match(key)) { // Key
      data[i] = data[i].replace(key, '<span class="key">$1</span>');
    }
    if (data[i].match(/^#/g)) { // Sharp
      if (data[i].match(/^# /g)) {
        h3Count += 1;
        h4Count = 0;
        data[i] = data[i].replace(/^# (.*)/gm, `<h2>${h3Count}. $1</h2>`);
        // .replace(/^#### (.*)/gm, `<h6>$1</h6>`)
      } else if (data[i].match(/^## /g)) {
        h4Count += 1;
        h5Count = 0;
        data[i] = data[i].replace(/^## (.*)/gm, `<h3>${h3Count}.${h4Count}. $1</h3>`)
      } else if (data[i].match(/^### /g)) {
        h5Count += 1;
        h6Count = 0;
        data[i] = data[i].replace(/^### (.*)/gm, `<h4>${h3Count}.${h4Count}.${h5Count}. $1</h4>`)
      } else if (data[i].match(/^#### /g)) {
        h6Count += 1;
        data[i] = data[i].replace(/^#### (.*)/gm, `<h5>${h3Count}.${h4Count}.${h5Count}.${h6Count}. $1</h5>`)
      }
    } else if (data[i] === '') {
      if (data[i-1]) {
        data[i-1] = data[i-1].replace(/<br>/, '</p>');
        pStatus = false;
      }
    } else {
      if (i+1 !== data.length) { // 마지막 줄이 아니면
        if (pStatus) {
          data[i] = data[i].replace(/(.*)/, '$1<br>');
        } else {
          data[i] = data[i].replace(/(.*)/, '<p>$1<br>');
          pStatus = true;
        }
      } else { // 마지막 줄
        if (!pStatus) {
          data[i] = data[i].replace(/(.*)/, '<p>$1</p>');
          pStatus = true;
        } else {
          data[i] = data[i].replace(/(.*)/, '$1</p>');
        }
      }
    }
  }
  data = data.filter(a => a !== '');
  data = data.join('\n');
  next(null, data);
};

module.exports = engine;