const onSubmit = () => {
  if (!frm.title.value) {
    alert('제목을 입력해주세요');
    return false;
  }

  if (!frm.content.value) {
    alert('내용을 입력해주세요');
    return false;
  }
  return true;
}

const imagesContainer = document.querySelector('.images');
// const articleId = document.querySelector('article').id;
const articleId = document.querySelector('input[name="articleId"]').value;
const s3Host = document.querySelector('input[name="s3Host"]').value;

const addEvent = async () => {
  const images = document.querySelectorAll('.image');
  images.forEach(i => {
    const deleteBtn = i.querySelector('.delete');
    deleteBtn.addEventListener('click', async () => {
      const imageList = await deleteImageApi(i.id);
      rewiteImages(imageList);
    });
    i.querySelector('img').addEventListener('click', () => {
      const text = `[[image:${i.id}]]`;
      const textarea = document.querySelector('textarea');
      const cursorPosition = textarea.selectionStart;
      const lastPosition = textarea.selectionEnd;
      textarea.value = textarea.value.slice(0, cursorPosition) + text + textarea.value.slice(cursorPosition);
      textarea.selectionStart = cursorPosition + text.length;
      textarea.selectionEnd = cursorPosition + text.length;
    });
  });
};

const rewiteImages = async (imageList) => {
  let line = '';
  imageList.forEach(i => {
    line += `<div class="image" id="${i.image}">`;
    line += `<img src="/assets/emptyRect.png" style="background-image: url('${s3Host}/article/${i.image}');">`; 
    line += `<div class="delete"></div>`;
    line += `</div>`;
  });
  imagesContainer.innerHTML = line;
  if (imageList.length) {
    imagesContainer.style.display = 'flex';
  } else {
    imagesContainer.style.display = 'none';
  }
  addEvent();
};

const addImageApi = async (formData) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        console.error(xhr.responseText);
        reject(false);
      }
    };
    xhr.open('POST', '/api/image/new');
    xhr.send(formData);
  });
};

const deleteImageApi = async (imageId) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        console.error(xhr.responseText);
        reject(false);
      }
    };
    const data = {
      articleId,
      imageId,
    };
    xhr.open('POST', '/api/image/delete');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  });
};

const submitImages = document.querySelector('input[name="images"]');
submitImages.addEventListener('change', async () => {
  const images = submitImages.files;
  const data = new FormData();
  data.append('articleId', articleId);
  for (let i = 0; i < images.length; i ++) {
    data.append('images', images[i]);
  }
  const imageList = await addImageApi(data);
  rewiteImages(imageList);
  submitImages.value = null;
});

addEvent();