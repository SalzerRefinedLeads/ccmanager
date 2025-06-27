import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import {WorktreeService} from '../services/worktreeService.js';
import {shortcutManager} from '../services/shortcutManager.js';

interface CommitChangesProps {
	worktreePath: string;
	onComplete: (committed: boolean) => void;
	onCancel: () => void;
}

type Step = 'review-files' | 'enter-message' | 'confirm';

interface FileItem {
	label: string;
	value: string;
	status: string;
}

const CommitChanges: React.FC<CommitChangesProps> = ({
	worktreePath,
	onComplete,
	onCancel,
}) => {
	const [step, setStep] = useState<Step>('review-files');
	const [files, setFiles] = useState<FileItem[]>([]);
	const [commitMessage, setCommitMessage] = useState('');
	const [isInputFocused, setIsInputFocused] = useState(false);

	useEffect(() => {
		const worktreeService = new WorktreeService();
		const result = worktreeService.hasUncommittedChanges(worktreePath);
		
		if (result.hasChanges && result.files) {
			const fileItems = result.files.map(file => {
				const status = file.substring(0, 2);
				const filename = file.substring(3);
				let statusDesc = '';
				
				if (status.includes('M')) statusDesc = 'Modified';
				else if (status.includes('A')) statusDesc = 'Added';
				else if (status.includes('D')) statusDesc = 'Deleted';
				else if (status.includes('??')) statusDesc = 'Untracked';
				else statusDesc = 'Changed';

				return {
					label: `[${statusDesc}] ${filename}`,
					value: filename,
					status: statusDesc,
				};
			});
			setFiles(fileItems);
		}
	}, [worktreePath]);

	useInput((input, key) => {
		if (shortcutManager.matchesShortcut('cancel', input, key)) {
			onCancel();
			return;
		}

		if (step === 'review-files' && key.return) {
			setStep('enter-message');
			setIsInputFocused(true);
			return;
		}

		if (step === 'enter-message') {
			if (key.return && commitMessage.trim()) {
				setStep('confirm');
				setIsInputFocused(false);
				return;
			}
		}
	});

	const handleCommit = () => {
		const worktreeService = new WorktreeService();
		const result = worktreeService.commitChanges(worktreePath, commitMessage);
		
		if (result.success) {
			onComplete(true);
		} else {
			// Could show error, for now just complete
			onComplete(false);
		}
	};

	const handleSkip = () => {
		onComplete(false);
	};

	if (step === 'review-files') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="green">
						Uncommitted Changes Detected
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text>
						The following files have uncommitted changes in the source branch:
					</Text>
				</Box>

				<Box flexDirection="column" marginBottom={1}>
					{files.map((file, index) => (
						<Box key={index}>
							<Text color="yellow">• {file.label}</Text>
						</Box>
					))}
				</Box>

				<Box marginBottom={1}>
					<Text>
						You can commit these changes or proceed without committing.
					</Text>
				</Box>

				<Box>
					<SelectInput
						items={[
							{label: 'Commit changes', value: 'commit'},
							{label: 'Proceed without committing', value: 'skip'},
						]}
						onSelect={(item) => {
							if (item.value === 'commit') {
								setStep('enter-message');
								setIsInputFocused(true);
							} else {
								handleSkip();
							}
						}}
						isFocused={true}
					/>
				</Box>

				<Box marginTop={1}>
					<Text dimColor>
						Press {shortcutManager.getShortcutDisplay('cancel')} to cancel
					</Text>
				</Box>
			</Box>
		);
	}

	if (step === 'enter-message') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="green">
						Commit Changes
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text>Enter a commit message:</Text>
				</Box>

				<Box marginBottom={1}>
					<TextInput
						value={commitMessage}
						onChange={setCommitMessage}
						placeholder="Your commit message..."
						focus={isInputFocused}
					/>
				</Box>

				<Box marginTop={1}>
					<Text dimColor>
						Press Enter to continue, {shortcutManager.getShortcutDisplay('cancel')} to cancel
					</Text>
				</Box>
			</Box>
		);
	}

	if (step === 'confirm') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="green">
						Confirm Commit
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text>
						Commit message: <Text color="yellow">"{commitMessage}"</Text>
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text>
						This will commit {files.length} file{files.length !== 1 ? 's' : ''}.
					</Text>
				</Box>

				<Box>
					<SelectInput
						items={[
							{label: 'Commit', value: 'commit'},
							{label: 'Cancel', value: 'cancel'},
						]}
						onSelect={(item) => {
							if (item.value === 'commit') {
								handleCommit();
							} else {
								onCancel();
							}
						}}
						isFocused={true}
					/>
				</Box>
			</Box>
		);
	}

	return null;
};

export default CommitChanges;