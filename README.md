# Folder Icon for Nextcloud

Folder Icon is a small Nextcloud app that lets folders use an image stored inside the folder as the folder icon in the Files web UI.

## How It Works

Put an image inside any folder and name it one of:

- `foldericon.png`
- `foldericon.jpg`
- `foldericon.jpeg`
- `foldericon.webp`
- `foldericon.gif`
- `foldericon`

Refresh the Files page. The parent folder listing will show that image as the folder icon.

## Requirements

- Nextcloud 32
- Files app enabled

## Installation

Copy this app into your Nextcloud apps directory:

```bash
cp -r foldericon /var/www/nextcloud/apps/foldericon
chown -R www-data:www-data /var/www/nextcloud/apps/foldericon
sudo -u www-data php /var/www/nextcloud/occ app:enable foldericon
```

Then reload the Nextcloud Files page.

## Notes

- This affects the Nextcloud web Files UI only.
- Mobile apps and desktop sync clients may still show the default folder icon.
- The `foldericon.*` file remains visible inside the folder.
- The app checks only visible folder rows and keeps network checks limited to avoid slowing down large directories.

## License

AGPL-3.0-or-later.
