/*
 * SPDX-FileCopyrightText: 2026 KaMiKenZa
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

(function() {
	'use strict';

	const ICON_FILE_NAMES = [
		'foldericon.png',
		'foldericon.jpg',
		'foldericon.jpeg',
		'foldericon.webp',
		'foldericon.gif',
		'foldericon',
	];

	const checkedFolders = new Map();
	const pendingFolders = new Map();
	const MAX_ROWS_PER_SCAN = 40;
	const MAX_PARALLEL_CHECKS = 4;
	let scanTimer = null;
	let scanRunning = false;
	let rescanRequested = false;

	const debounceScan = () => {
		window.clearTimeout(scanTimer);
		scanTimer = window.setTimeout(scanVisibleFolders, 250);
	};

	const normalizeDir = (dir) => {
		if (!dir || dir === '.') {
			return '/';
		}
		let normalized = String(dir);
		try {
			normalized = decodeURIComponent(normalized);
		} catch (e) {
			// Keep the original value if it was not URI encoded.
		}
		normalized = normalized.replace(/\/+/g, '/');
		if (!normalized.startsWith('/')) {
			normalized = '/' + normalized;
		}
		return normalized.replace(/\/$/, '') || '/';
	};

	const joinPath = (...parts) => {
		return normalizeDir(parts
			.filter((part) => part !== undefined && part !== null && String(part) !== '')
			.join('/'));
	};

	const encodePath = (path) => {
		return normalizeDir(path)
			.split('/')
			.filter(Boolean)
			.map((part) => encodeURIComponent(part))
			.join('/');
	};

	const decodeBase64 = (value) => {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		let output = '';
		let buffer = 0;
		let bits = 0;
		for (const character of String(value).replace(/[\r\n\s]/g, '')) {
			if (character === '=') {
				break;
			}
			const index = chars.indexOf(character);
			if (index < 0) {
				continue;
			}
			buffer = (buffer << 6) | index;
			bits += 6;
			if (bits >= 8) {
				bits -= 8;
				output += String.fromCharCode((buffer >> bits) & 0xff);
			}
		}
		return output;
	};

	const getInitialState = (app, key) => {
		const input = document.getElementById(`initial-state-${app}-${key}`);
		if (!input || !input.value) {
			return null;
		}

		try {
			return JSON.parse(decodeBase64(input.value));
		} catch (e) {
			return null;
		}
	};

	const getCurrentUserId = () => {
		if (window.OC?.getCurrentUser && OC.getCurrentUser()) {
			return OC.getCurrentUser().uid;
		}
		if (window.OC?.currentUser) {
			return OC.currentUser;
		}

		const coreConfig = getInitialState('core', 'config');
		const storageStats = getInitialState('files', 'storageStats');
		return coreConfig?.currentUser?.uid
			|| coreConfig?.user?.uid
			|| coreConfig?.uid
			|| storageStats?.owner
			|| null;
	};

	const getWebRoot = () => {
		if (window.OC?.webroot !== undefined) {
			return OC.webroot || '';
		}

		const indexPhpPosition = window.location.pathname.indexOf('/index.php/');
		if (indexPhpPosition >= 0) {
			return window.location.pathname.slice(0, indexPhpPosition);
		}

		const appsPosition = window.location.pathname.indexOf('/apps/');
		if (appsPosition >= 0) {
			return window.location.pathname.slice(0, appsPosition);
		}

		return '';
	};

	const getCurrentDirectory = () => {
		try {
			const fileList = window.OCA?.Files?.App?.currentFileList;
			if (fileList?.getCurrentDirectory) {
				return normalizeDir(fileList.getCurrentDirectory());
			}
		} catch (e) {
			// Fall through to the URL-based fallback.
		}

		const params = new URLSearchParams(window.location.search);
		return normalizeDir(params.get('dir') || '/');
	};

	const getDavUrl = (filePath) => {
		const userId = getCurrentUserId();
		if (!userId) {
			return null;
		}

		const base = window.OC?.linkToRemote
			? OC.linkToRemote(`dav/files/${encodeURIComponent(userId)}`)
			: `${getWebRoot()}/remote.php/dav/files/${encodeURIComponent(userId)}`;
		const encodedPath = encodePath(filePath);
		return `${base}/${encodedPath}`;
	};

	const parseDirectoryFromLink = (row) => {
		const links = row.querySelectorAll('a[href*="dir="]');
		for (const link of links) {
			try {
				const url = new URL(link.href, window.location.href);
				const dir = url.searchParams.get('dir');
				if (dir) {
					return normalizeDir(dir);
				}
			} catch (e) {
				// Ignore invalid URLs.
			}
		}
		return null;
	};

	const getRowName = (row) => {
		const directValue = row.getAttribute('data-cy-files-list-row-name')
			|| row.dataset.file
			|| row.dataset.basename
			|| row.dataset.filename
			|| row.getAttribute('data-file')
			|| row.getAttribute('data-basename')
			|| row.getAttribute('data-filename');
		if (directValue) {
			return directValue;
		}

		const nameElement = row.querySelector('[data-cy-files-list-row-name], .files-list__row-name, .nametext, .innernametext, [title]');
		if (nameElement) {
			return (nameElement.getAttribute('title') || nameElement.textContent || '').trim();
		}

		return '';
	};

	const isFolderRow = (row) => {
		const type = row.dataset.type || row.getAttribute('data-type') || '';
		const mime = row.dataset.mime || row.dataset.mimetype || row.getAttribute('data-mime') || row.getAttribute('data-mimetype') || '';
		if (type === 'dir' || type === 'folder' || mime === 'httpd/unix-directory') {
			return true;
		}

		if (row.querySelector('.icon-folder, .folder-icon, [class*="icon-folder"], [class*="folder-icon"], [data-mime="httpd/unix-directory"]')) {
			return true;
		}

		const folderButton = row.querySelector('[aria-label^="Open folder "], [aria-label^="Toggle selection for folder "]');
		if (folderButton) {
			return true;
		}

		const linkedDirectory = parseDirectoryFromLink(row);
		return Boolean(linkedDirectory && linkedDirectory !== getCurrentDirectory());
	};

	const getFolderPath = (row) => {
		const fromLink = parseDirectoryFromLink(row);
		if (fromLink) {
			return fromLink;
		}

		const rowName = getRowName(row);
		if (!rowName) {
			return null;
		}

		return joinPath(getCurrentDirectory(), rowName);
	};

	const findIconElement = (row) => {
		return row.querySelector('[data-cy-files-list-row-icon], .files-list__row-icon, .filename .thumbnail, .thumbnail, .icon-folder, .folder-icon, [class*="icon-folder"], [class*="folder-icon"]');
	};

	const findRows = () => {
		const selectors = [
			'tr[data-file]',
			'tr[data-cy-files-list-row]',
			'[data-cy-files-list-row]',
			'.files-list__row',
			'.file-row',
		];

		return [...new Set(Array.from(document.querySelectorAll(selectors.join(','))))].filter((row) => {
			return row instanceof HTMLElement && row.getClientRects().length > 0 && isFolderRow(row);
		});
	};

	const setCustomIcon = (row, imageUrl) => {
		const iconElement = findIconElement(row);
		if (!iconElement) {
			return;
		}

		iconElement.classList.add('foldericon-custom-icon');
		iconElement.style.setProperty('--foldericon-url', `url("${imageUrl.replace(/"/g, '\\"')}")`);
		row.classList.add('foldericon-has-custom-icon');
	};

	const clearCustomIcon = (row) => {
		const iconElement = findIconElement(row);
		if (!iconElement) {
			return;
		}

		iconElement.classList.remove('foldericon-custom-icon');
		iconElement.style.removeProperty('--foldericon-url');
		row.classList.remove('foldericon-has-custom-icon');
	};

	const findIconForFolder = async (folderPath) => {
		if (checkedFolders.has(folderPath)) {
			return checkedFolders.get(folderPath);
		}
		if (pendingFolders.has(folderPath)) {
			return pendingFolders.get(folderPath);
		}

		const pending = (async () => {
			for (const fileName of ICON_FILE_NAMES) {
				const url = getDavUrl(joinPath(folderPath, fileName));
				if (!url) {
					continue;
				}

				const controller = new AbortController();
				const timeout = window.setTimeout(() => controller.abort(), 2500);
				try {
					const response = await fetch(url, {
						method: 'HEAD',
						credentials: 'same-origin',
						signal: controller.signal,
					});
					if (response.ok) {
						checkedFolders.set(folderPath, url);
						return url;
					}
				} catch (e) {
					// Try the next candidate.
				} finally {
					window.clearTimeout(timeout);
				}
			}

			checkedFolders.set(folderPath, null);
			return null;
		})().finally(() => pendingFolders.delete(folderPath));

		pendingFolders.set(folderPath, pending);
		return pending;
	};

	async function scanVisibleFolders() {
		const isFilesView = document.body.classList.contains('app-files')
			|| window.location.pathname.includes('/apps/files/')
			|| document.querySelector('[data-cy-files-list-row], .files-list__row');
		if (!isFilesView) {
			return;
		}

		if (scanRunning) {
			rescanRequested = true;
			return;
		}

		scanRunning = true;
		try {
			const rows = findRows().slice(0, MAX_ROWS_PER_SCAN);
			for (let index = 0; index < rows.length; index += MAX_PARALLEL_CHECKS) {
				const batch = rows.slice(index, index + MAX_PARALLEL_CHECKS);
				await Promise.all(batch.map(async (row) => {
					const folderPath = getFolderPath(row);
					if (!folderPath) {
						return;
					}

					const iconUrl = await findIconForFolder(folderPath);
					if (iconUrl) {
						setCustomIcon(row, iconUrl);
					} else {
						clearCustomIcon(row);
					}
				}));
			}
		} finally {
			scanRunning = false;
			if (rescanRequested) {
				rescanRequested = false;
				debounceScan();
			}
		}
	}

	const observeFilesView = () => {
		debounceScan();

		const observer = new MutationObserver(debounceScan);
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		window.addEventListener('popstate', debounceScan);
		window.addEventListener('hashchange', debounceScan);
		document.addEventListener('DOMContentLoaded', debounceScan);
		document.addEventListener('click', (event) => {
			if (event.target instanceof Element && event.target.closest('a')) {
				window.setTimeout(debounceScan, 600);
			}
		}, true);
	};

	observeFilesView();
})();
