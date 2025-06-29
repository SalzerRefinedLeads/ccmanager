import React, {useState} from 'react';
import {Box, Text, useInput, Key} from 'ink';
import TextInput from 'ink-text-input';
import {configurationManager} from '../services/configurationManager.js';
import {shortcutManager} from '../services/shortcutManager.js';
import {CommandConfig} from '../types/index.js';

interface ConfigureCommandProps {
	onComplete: () => void;
}

type EditMode = 'menu' | 'command' | 'args' | 'fallbackArgs';

const ConfigureCommand: React.FC<ConfigureCommandProps> = ({onComplete}) => {
	// Load current configuration once
	const currentConfig = configurationManager.getCommandConfig();

	const [originalConfig] = useState<CommandConfig>(currentConfig);
	const [config, setConfig] = useState<CommandConfig>(currentConfig);
	const [editMode, setEditMode] = useState<EditMode>('menu');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [inputValue, setInputValue] = useState('');
	const [hasChanges, setHasChanges] = useState(false);

	const menuItems = [
		{
			label: 'Command',
			value: config.command,
			key: 'command',
			isButton: false,
			disabled: false,
		},
		{
			label: 'Arguments',
			value: config.args?.join(' ') || '(none)',
			key: 'args',
			isButton: false,
			disabled: false,
		},
		{
			label: 'Fallback Arguments',
			value: config.fallbackArgs?.join(' ') || '(none)',
			key: 'fallbackArgs',
			isButton: false,
			disabled: false,
		},
		{
			label: hasChanges ? 'Save Changes' : 'Save Changes (no changes)',
			value: '',
			key: 'save',
			isButton: true,
			disabled: !hasChanges,
		},
		{
			label: 'Exit Without Saving',
			value: '',
			key: 'exit',
			isButton: true,
			disabled: false,
		},
	];

	const handleMenuNavigation = (key: Key) => {
		if (key.upArrow) {
			setSelectedIndex(prev => (prev > 0 ? prev - 1 : menuItems.length - 1));
		} else if (key.downArrow) {
			setSelectedIndex(prev => (prev < menuItems.length - 1 ? prev + 1 : 0));
		}
	};

	const getInitialInputValue = (key: string): string => {
		switch (key) {
			case 'command':
				return config.command;
			case 'args':
				return config.args?.join(' ') || '';
			case 'fallbackArgs':
				return config.fallbackArgs?.join(' ') || '';
			default:
				return '';
		}
	};

	const handleMenuItemSelect = () => {
		const selectedItem = menuItems[selectedIndex];
		if (!selectedItem || selectedItem.disabled) return;

		switch (selectedItem.key) {
			case 'save':
				configurationManager.setCommandConfig(config);
				onComplete();
				break;
			case 'exit':
				onComplete();
				break;
			default:
				if (!selectedItem.isButton) {
					setEditMode(selectedItem.key as EditMode);
					setInputValue(getInitialInputValue(selectedItem.key));
				}
		}
	};

	useInput((input, key) => {
		// Handle cancel shortcut in any mode
		if (shortcutManager.matchesShortcut('cancel', input, key)) {
			if (editMode === 'menu') {
				onComplete(); // Exit without saving
			} else {
				setEditMode('menu');
				setInputValue('');
			}
			return;
		}

		// Handle menu mode inputs
		if (editMode === 'menu') {
			handleMenuNavigation(key);
			if (key.return) {
				handleMenuItemSelect();
			}
		}
	});

	const handleInputSubmit = (value: string) => {
		let updatedConfig = {...config};

		if (editMode === 'command') {
			updatedConfig.command = value || 'claude';
		} else if (editMode === 'args') {
			// Parse arguments, handling empty string as no arguments
			const args = value.trim() ? value.trim().split(/\s+/) : undefined;
			updatedConfig.args = args;
		} else if (editMode === 'fallbackArgs') {
			// Parse fallback arguments, handling empty string as no arguments
			const fallbackArgs = value.trim() ? value.trim().split(/\s+/) : undefined;
			updatedConfig.fallbackArgs = fallbackArgs;
		}

		// Update state only (don't save to file yet)
		setConfig(updatedConfig);

		// Check if there are changes
		const hasChanges =
			JSON.stringify(updatedConfig) !== JSON.stringify(originalConfig);
		setHasChanges(hasChanges);

		// Return to menu
		setEditMode('menu');
		setInputValue('');
	};

	if (editMode !== 'menu') {
		const titles = {
			command: 'Enter command (e.g., claude):',
			args: 'Enter command arguments (space-separated):',
			fallbackArgs: 'Enter fallback arguments (space-separated):',
		};

		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="green">
						Configure Command
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text>{titles[editMode]}</Text>
				</Box>

				<Box>
					<TextInput
						value={inputValue}
						onChange={setInputValue}
						onSubmit={handleInputSubmit}
						placeholder={
							editMode === 'args' || editMode === 'fallbackArgs'
								? 'e.g., --resume or leave empty'
								: ''
						}
					/>
				</Box>

				<Box marginTop={1}>
					<Text dimColor>
						Press Enter to save, {shortcutManager.getShortcutDisplay('cancel')}{' '}
						to cancel
					</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text bold color="green">
					Configure Command
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text dimColor>
					Configure the command and arguments for running code sessions
				</Text>
			</Box>

			{hasChanges && (
				<Box marginBottom={1}>
					<Text color="yellow">You have unsaved changes</Text>
				</Box>
			)}

			<Box flexDirection="column">
				{menuItems.map((item, index) => {
					const isSelected = selectedIndex === index;
					const isDisabled = item.disabled || false;
					const color = isDisabled ? 'gray' : isSelected ? 'cyan' : undefined;

					return (
						<Box key={item.key} marginTop={item.isButton && index > 0 ? 1 : 0}>
							<Text color={color}>
								{isSelected ? '> ' : '  '}
								{item.isButton ? (
									<Text bold={isSelected && !isDisabled} dimColor={isDisabled}>
										{item.label}
									</Text>
								) : (
									`${item.label}: ${item.value}`
								)}
							</Text>
						</Box>
					);
				})}
			</Box>

			<Box marginTop={1}>
				<Text dimColor>
					Press ↑↓ to navigate, Enter to edit,{' '}
					{shortcutManager.getShortcutDisplay('cancel')} to go back
				</Text>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>
					Note: If command fails with main args, fallback args will be tried
				</Text>
			</Box>
		</Box>
	);
};

export default ConfigureCommand;
