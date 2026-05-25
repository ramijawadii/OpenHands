export type ConversationCardTitleMode = "view" | "edit";

export type ConversationCardTitleProps = {
  titleMode: ConversationCardTitleMode;
  title: string;
  onSave: (title: string) => void;
};

export function ConversationCardTitle({
  titleMode,
  title,
  onSave,
}: ConversationCardTitleProps) {
  if (titleMode === "edit") {
    return (
      <input
        /* eslint-disable jsx-a11y/no-autofocus */
        autoFocus
        data-testid="conversation-card-title"
        onClick={(event: React.MouseEvent<HTMLInputElement>) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onBlur={(e) => {
          const trimmed = e.currentTarget?.value?.trim?.() ?? "";
          onSave(trimmed);
        }}
        onKeyUp={(event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        type="text"
        defaultValue={title}
        className="text-sm leading-6 font-semibold bg-transparent w-full"
      />
    );
  }

  return (
    <p
      data-testid="conversation-card-title"
      className="text-sm font-normal bg-transparent whitespace-nowrap overflow-hidden flex-1 min-w-0 text-[var(--cg-text-nav)]"
      title={title}
      style={{
        maskImage: "linear-gradient(to right, black 78%, transparent 95%)",
        WebkitMaskImage: "linear-gradient(to right, black 78%, transparent 95%)",
      }}
    >
      {title}
    </p>
  );
}
