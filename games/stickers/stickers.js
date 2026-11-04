// Sticker Book: every finished game earns the next sticker.
const $ = id => document.getElementById(id);

async function begin() {
  Icons.fill();
  const earned = await Arcade.syncStickers();
  $('earned').textContent = Math.min(earned, Arcade.STICKERS.length);
  $('book').replaceChildren(...Arcade.STICKERS.map((sticker, index) => {
    const unlocked = index < earned;
    const button = document.createElement('button');
    button.className = unlocked ? 'sticker' : 'sticker locked';
    button.style.setProperty('--order', index);
    button.style.setProperty('--sticker', sticker.color);
    button.setAttribute('aria-label', unlocked ? `Sticker ${index + 1}` : 'Locked sticker');
    button.innerHTML = Icons.svg(unlocked ? sticker.icon : 'lock');
    button.onclick = () => {
      Sfx.play(unlocked ? 'star' : 'drop', index % 5);
      if (unlocked) Arcade.burst(button);
      button.classList.remove('shake');
      void button.offsetWidth;
      button.classList.add('shake');
    };
    return button;
  }));
}

begin();
