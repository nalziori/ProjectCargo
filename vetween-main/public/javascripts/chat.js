const socket = io();

const chatInput = document.getElementById('msg');
const chatButton = document.getElementById('send');
const iframe = document.getElementById('chatWindow');
// const userCount = document.querySelector('#userCount');

const chatExpand = document.getElementById('chatExpand');
const chatBox = document.getElementById('chatBox');

if (chatExpand) {
  chatExpand.addEventListener('click', () => {
    chatBox.style.height = '300px';
  });
}

socket.on('userCount', (count) => {
  const userCount = document.querySelector('#userCount');
  const customCounters = document.querySelectorAll('#customCounter');
  if (userCount) {
    userCount.innerHTML = `(${count})`;
  }
  customCounters.forEach(customCounter => {
    customCounter.innerHTML = `${Number(count).toLocaleString()}`;
  });
});

const getChat = (type, target) => {
  return new Promise((resolve, reject) => {
    const data = {
      type,
      target,
    };
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/getChat');
    xhr.onload = () => {
      const result = JSON.parse(xhr.responseText);
      resolve(result);
    };
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  });
};

if (iframe) {
  iframe.onload = async () => {
    const chatList = iframe.contentWindow.document.getElementById('chatList');
    // 기존 채팅 추가
    const data = await getChat('all', null);
    const usePermissionImageBoolean = await usePermissionImage();
    let html = '';
    if (usePermissionImageBoolean) {
      data.forEach(d => {
        html += `<li><span class="nickName"><img src="${d.user.user.permissionImage}">${d.user.user.nickName}</span>`;
        html += `<span class="message">${d.message}</span></li>`;
      });
    } else {
      data.forEach(d => {
        html += `<li><span class="nickName">${d.user.user.nickName}</span>`;
        html += `<span class="message">${d.message}</span></li>`;
      });
    }
    chatList.innerHTML = chatList.innerHTML + html;
    
    
    // 스크롤 최하단 이동
    const body = iframe.contentWindow.document.querySelector('body');
    body.scrollTop = chatList.scrollHeight;
    
    // 새 채팅 추가
    socket.on('updateMessage', (data) => {
      let html = '';
      if (usePermissionImageBoolean) {
        html += `<li><span class="nickName"><img src="${data.user.permissionImage}">${data.user.nickName}</span>`;
      } else {
        html += `<li><span class="nickName">${data.user.nickName}</span>`;
      }
      html += `<span class="message">${data.message}</span></li>`;
      chatList.innerHTML = chatList.innerHTML + html;
      // 스크롤 최하단 이동
      const body = iframe.contentWindow.document.querySelector('body');
      body.scrollTop = chatList.scrollHeight;
    });
      
    const user = await getUser();
    chatButton.addEventListener('click', async () => {
      let message = chatInput.value;
      const tagRegex = new RegExp(/<[^>]*>/g);
      message = message.replace(tagRegex, '');
      message = message.replace(/\n/ig, '<br>');
      if (message !== '') {
        socket.emit('sendMessage', {
          user,
          message,
        });
        chatInput.value = '';
        chatInput.focus();
      }
    });
  }
}

const moveFocus = (next) => {
  if (window.event.keyCode === 13) {
    chatInput.focus();
    if (next === 'send') {
      chatButton.click();
    }
  }
};