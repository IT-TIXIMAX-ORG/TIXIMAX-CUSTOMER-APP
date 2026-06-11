// Bottom sheet "Cập nhật thông tin" — liệt kê các đầu mục cần cập nhật, mở từ ProfileUpdateWidget.
// Mỗi task deep-link vào modal tương ứng qua task.action; modal state của màn hình là union đơn
// nên việc set modal mới tự đóng sheet này (không bao giờ có 2 ModalShell cùng visible).

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ModalShell } from '@/src/components/ui/ModalShell';
import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import type { ProfileTask } from './types';

type Props = {
  visible: boolean;
  onClose: () => void;
  tasks: ProfileTask[];
  completedCount: number;
};

export function ProfileTasksSheet({ visible, onClose, tasks, completedCount }: Props) {
  const percent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const nextTask = tasks.find((task) => !task.completed);

  return (
    <ModalShell visible={visible} title="Cập nhật thông tin" onClose={onClose}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.summary}>
        {completedCount}/{tasks.length} mục hoàn thành
      </Text>
      <Text style={styles.hint}>
        {nextTask
          ? `Nhiệm vụ tiếp theo: ${nextTask.title}. Hệ thống sẽ tự cập nhật cấp độ khi bạn hoàn thành.`
          : 'Bạn đã hoàn thành các nhiệm vụ gợi ý. Hệ thống sẽ tự cập nhật cấp độ.'}
      </Text>
      <View style={styles.taskList}>
        {tasks.map((task) => (
          <Pressable
            key={task.key}
            style={[styles.taskItem, task.completed && styles.taskItemDone]}
            onPress={task.action}
            accessibilityRole="button"
            accessibilityLabel={`${task.title}, ${task.completed ? 'đã hoàn thành' : 'chưa hoàn thành'}`}
          >
            <View style={[styles.taskIconWrap, task.completed && styles.taskIconWrapDone]}>
              <Feather
                name={task.completed ? 'check' : 'arrow-up-right'}
                size={15}
                color={task.completed ? colors.successText : colors.primaryDark}
              />
            </View>
            <View style={styles.taskContent}>
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>{task.title}</Text>
              <Text style={styles.taskDetail}>{task.detail}</Text>
            </View>
            <Text style={[styles.taskStatus, task.completed && styles.taskStatusDone]}>
              {task.completed ? 'Hoàn thành' : 'Thực hiện'}
            </Text>
          </Pressable>
        ))}
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  summary: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  hint: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    lineHeight: 20,
  },
  taskList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  taskItemDone: {
    backgroundColor: colors.successLight,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  taskIconWrap: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconWrapDone: {
    backgroundColor: colors.white,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    fontSize: typography.fontSize.sm,
  },
  taskTitleDone: {
    color: colors.successText,
  },
  taskDetail: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    lineHeight: 16,
  },
  taskStatus: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
  },
  taskStatusDone: {
    color: colors.successText,
  },
});
