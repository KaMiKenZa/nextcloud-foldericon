<?php

declare(strict_types=1);

// SPDX-FileCopyrightText: 2026 KaMiKenZa
// SPDX-License-Identifier: AGPL-3.0-or-later

namespace OCA\FolderIcon\Listeners;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\FolderIcon\AppInfo\Application;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Util;

class FilesLoadAdditionalScriptsListener implements IEventListener {
	public function handle(Event $event): void {
		if (!$event instanceof LoadAdditionalScriptsEvent) {
			return;
		}

		Util::addScript(Application::APP_ID, 'foldericon-main-v2');
		Util::addStyle(Application::APP_ID, 'foldericon-main-v2');
	}
}
