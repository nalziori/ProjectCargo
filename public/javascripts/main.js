// Delete Button Confirm
const deleteBtn = document.querySelectorAll('button[value="delete"]');
deleteBtn.forEach(b => {
  b.addEventListener('click', (e) => {
    if (!confirm('삭제 확인')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
});

const withdrawBtn = document.querySelector('button[value="withdraw"]');
if (withdrawBtn) {
  withdrawBtn.addEventListener('click', (e) => {
    if (!confirm('탈퇴 확인')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
}

const getUser = () => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/getUser');
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        console.error(xhr.responseText);
      }
    };
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send();
  });
};

const getBoard = (boardId) => {
  return new Promise((resolve, reject) => {
    const data = {
      boardId,
    };
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/getBoard');
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        console.error(xhr.responseText);
      }
    };
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  });
};

const getUserGroupPermission = (boardId, type) => {
  return new Promise((resolve, reject) => {
    const data = {
      boardId,
      type,
    };
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/getUserGroupPermission');
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        console.error(xhr.responseText);
      }
    };
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  });
};

const getSetting = () => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/getSetting');
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        console.error(xhr.responseText);
      }
    };
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send();
  });
};

const usePermissionImage = async () => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        console.error(xhr.responseText);
      }
    };
    xhr.open('GET', '/api/usePermissionImage');
    xhr.send();
  });
};

const blockWordsCheck = (content) => {
  return new Promise((resolve, reject) => {
    const data = {
      content,
    };
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        console.error(xhr.responseText);
      }
    };
    xhr.open('POST', '/api/blockWordsCheck');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  });
}

// modal
const modalContainer = document.querySelector('article #modal');
const modalBackground = document.querySelector('article #modal .background');
const modalContainers = document.querySelectorAll('article #modal .container');
const modal = {
  create (selector) {
    modalContainer.classList.add('active');
    selector.classList.add('active');
  },
  remove (selector) {
    modalContainer.classList.remove('active');
    selector.classList.remove('active');
  }
}
if (modalBackground) {
  modalBackground.addEventListener('click', () => {
    modalContainer.classList.remove('active');
    modalContainers.forEach(modalContainer => {
      modalContainer.classList.remove('active');
    });
  });
}

// report
const report = (data, reportContainer) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        console.error(xhr.responseText);
      }
    };
    xhr.open('POST', '/api/report');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  });
}

const reportContainer = document.querySelector('#modal .report');
const reportType = document.querySelector('#modal .report input[name="type"]');
const reportId = document.querySelector('#modal .report input[name="id"]');
const reportCategory = document.querySelector('#modal .report input[name="reportCategory"]');
const reportContent = document.querySelector('#modal .report textarea');
const reportCompleteBtn = document.querySelector('#modal .report button');
if (reportCompleteBtn) {
  reportCompleteBtn.addEventListener('click', async () => {
    const data = {
      reportType: reportType.value,
      reportId: reportId.value,
      reportCategory: reportCategory.value,
      content: reportContent.value,
    };
    const result = await report(data);
    if (result) {
      modal.remove(reportContainer);
      reportContent.value = '';
      alert(result.message);
    }
  });
}