# Folder Icon for Nextcloud

Folder Icon is a small Nextcloud app that lets folders use an image stored inside the folder as the folder icon in the Files web UI.

Latest version: `0.1.1`

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

Install the latest release from GitHub:

```bash
cd /tmp
curl -L https://github.com/KaMiKenZa/nextcloud-foldericon/archive/refs/tags/v0.1.1.tar.gz -o foldericon.tar.gz
tar -xzf foldericon.tar.gz

sudo rm -rf /var/www/nextcloud/apps/foldericon
sudo cp -a nextcloud-foldericon-0.1.1 /var/www/nextcloud/apps/foldericon
sudo chown -R www-data:www-data /var/www/nextcloud/apps/foldericon

sudo -u www-data php /var/www/nextcloud/occ app:enable foldericon
sudo -u www-data php /var/www/nextcloud/occ upgrade
```

If you already cloned this repository manually, copy it into your Nextcloud apps directory:

```bash
cp -r foldericon /var/www/nextcloud/apps/foldericon
chown -R www-data:www-data /var/www/nextcloud/apps/foldericon
sudo -u www-data php /var/www/nextcloud/occ app:enable foldericon
```

Then reload the Nextcloud Files page.

## Update

To update to the latest version, repeat the installation commands above. Then run:

```bash
sudo -u www-data php /var/www/nextcloud/occ upgrade
sudo -u www-data php /var/www/nextcloud/occ app:list | grep foldericon
```

The app list should show `foldericon: 0.1.1`.

## Notes

- This affects the Nextcloud web Files UI only.
- Mobile apps and desktop sync clients may still show the default folder icon.
- The `foldericon.*` file remains visible inside the folder.
- The app checks only visible folder rows and keeps network checks limited to avoid slowing down large directories.

## License

Copyright (c) 2026 KaMiKenZa.

Licensed under the GNU Affero General Public License v3.0 or later.
