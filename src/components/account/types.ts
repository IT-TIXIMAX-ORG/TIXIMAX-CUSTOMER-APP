// Kiểu dữ liệu dùng chung cho các component màn hình Tài khoản.

export type ProfileTask = {
  key: string;
  title: string;
  detail: string;
  completed: boolean;
  action: () => void;
};
