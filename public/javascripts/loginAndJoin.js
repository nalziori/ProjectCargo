const uIdCheck = (uId) => {
  return new Promise((resolve, reject) => {
    const data = {
      uId,
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
    xhr.open('POST', '/api/idCheck');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  });
};

const nickNameCheck = (nickName) => {
  return new Promise((resolve, reject) => {
    const data = {
      nickName,
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
    xhr.open('POST', '/api/nickNameCheck');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  });
};

const emailCheck = (email) => {
  return new Promise((resolve, reject) => {
    const data = {
      email,
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
    xhr.open('POST', '/api/emailCheck');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  });
};

let timeout = null;
const uId = document.querySelector('#uId input');
const nickName = document.querySelector('#nickName input');
const uIdGuide = document.querySelector('#uId .guide');
const nickNameGuide = document.querySelector('#nickName .guide');
const email = document.querySelector('#email input');
const emailGuide = document.querySelector('#email .guide');
if (uId) {
  uId.addEventListener('keyup', () => {
    clearTimeout(timeout);
    
    timeout = setTimeout(async () => {
      const result = await uIdCheck(frm.uId.value);
      if (frm.uId.value.length >= 6) {
        if (result) {
          uIdGuide.className = 'guide green marginBottom10';
          uIdGuide.innerHTML = '생성가능한 아이디 입니다';
          joinBtn.disabled = false;
        } else {
          uIdGuide.className = 'guide red marginBottom10';
          uIdGuide.innerHTML = '중복된 아이디 입니다';
          joinBtn.disabled = true;
        }
      } else {
        uIdGuide.className = 'guide red marginBottom10';
        uIdGuide.innerHTML = '아이디는 6~15자의 영문소문자, 숫자 입니다';
        joinBtn.disabled = true;
      }
    }, 500);
  });
}

if (nickName) {
  nickName.addEventListener('keyup', () => {
    clearTimeout(timeout);

    timeout = setTimeout(async () => {
      const result = await nickNameCheck(frm.nickName.value);
      if (frm.nickName.value.length >= 6) {
        if (result) {
          nickNameGuide.className = 'guide green marginBottom10';
          nickNameGuide.innerHTML = '생성가능한 닉네임 입니다';
          joinBtn.disabled = false;
        } else {
          nickNameGuide.className = 'guide red marginBottom10';
          nickNameGuide.innerHTML = '중복된 닉네임 입니다';
          joinBtn.disabled = true;
        }
      }
    }, 500);
  });
}

if (email) {
  email.addEventListener('keyup', () => {
    clearTimeout(timeout);

    timeout = setTimeout(async () => {
      const result = await emailCheck(frm.email.value);
      if (result.status) {
        emailGuide.classList.add('hide');
        joinBtn.disabled = false;
      } else {
        emailGuide.className = 'guide red marginBottom10';
        emailGuide.innerHTML = result.message;
        joinBtn.disabled = true;
      }
    }, 500);
  });
}

const onSubmit = () => {
  if (!frm.uId.value || !frm.password.value || !frm.passwordCheck.value || !frm.nickName.value/* || !frm.email.value*/) {
    alert('입력란을 모두 입력해주세요');
    return false;
  }

  if (!frm.uId.value.length > 6 && !frm.uId.value.length < 15) {
    alert('아이디는 6~15자의 영문소문자, 숫자 입니다');
    return false;
  }

  if (!frm.password.value.length > 6) {
    alert('비밀번호는 6자리 이상 입력해주세요');
    return false;
  }
/*
  const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/ig;
  if (!frm.email.value.match(emailRegex)) {
    alert('올바른 이메일 형식을 입력해주세요');
    return false;
  }

  if (frm.phone && !frm.phone.value) {
    alert('연락처를 입력해주세요');
    return false;
  }
  
  if (frm.agreement && !frm.agreement.checked) {
    alert('이용약관 및 개인정보수집 정책에 동의해야 합니다');
    return false;
  }*/
};
