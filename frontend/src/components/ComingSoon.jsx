export default function ComingSoon({ title, description, icon: Icon }) {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">{title}</div>
        </div>
      </div>
      <div className="panel">
        <div className="coming-soon">
          {Icon && <div className="coming-soon-icon"><Icon size={24} /></div>}
          <h3>Coming soon</h3>
          <p>{description}</p>
        </div>
      </div>
    </>
  );
}
