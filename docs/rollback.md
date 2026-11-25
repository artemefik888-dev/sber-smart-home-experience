# Безопасный откат релиза 2

Состояние публичной версии перед релизом сохранено аннотированным тегом `rollback-before-release-2-2026-11-25`. Он указывает на коммит `303114cf72ecf33146d008d04a7cbcd0c18471b3`.

Релиз 2 опубликован одним коммитом, которому соответствует тег `release-2-stable-2026-11-25`. Для возврата выполните обычный отменяющий коммит:

```bash
git fetch origin --tags
git switch main
git pull --ff-only origin main
git revert --no-edit release-2-stable-2026-11-25
git push origin main
```

Если поверх релиза уже вышли изменения и Git сообщает конфликт, проверьте затронутые файлы и завершите откат через `git revert --continue`. Если откат в таком виде не нужен, выполните `git revert --abort`.

После отправки дождитесь успешного Pages workflow для отменяющего коммита и проверьте прежний вид главной страницы, открытие гостиной и демо-корзину. Перезаписывать ветку или переносить тег не требуется.

[GitHub Pages](https://artemefik888-dev.github.io/sber-smart-home-experience/) · [История публикаций](https://github.com/artemefik888-dev/sber-smart-home-experience/actions/workflows/pages.yml)
