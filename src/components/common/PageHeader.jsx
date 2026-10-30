export default function PageHeader({ eyebrow, title, subtitle, actions, icon: Icon }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        {Icon ? (
          <div className="mt-0.5 hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
            <Icon className="h-6 w-6" strokeWidth={1.8} />
          </div>
        ) : null}
        <div>
          {eyebrow ? <p className="mg-eyebrow mb-1.5">{eyebrow}</p> : null}
          <h1 className="text-2xl font-extrabold text-foreground sm:text-[30px]">{title}</h1>
          {subtitle ? <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}
