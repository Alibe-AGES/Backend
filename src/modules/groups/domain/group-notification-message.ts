const USER_REFERENCE_PATTERN =
  /\$\{user:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\}/gi;

export function groupNotificationUserReference(userId: string): string {
  return `\${user:${userId}}`;
}

export function groupNotificationUserIds(message: string): string[] {
  return [...message.matchAll(USER_REFERENCE_PATTERN)].map((match) => match[1].toLowerCase());
}

export function resolveGroupNotificationUsers(
  message: string,
  userNames: ReadonlyMap<string, string>
): string {
  return message.replace(USER_REFERENCE_PATTERN, (_reference, userId: string) => {
    return userNames.get(userId.toLowerCase()) ?? 'Usuário';
  });
}
