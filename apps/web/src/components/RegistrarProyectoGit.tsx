import './RegistrarProyectoGit.css'

function RegistrarProyectoGit() {
  return (
    <div className="rpg-page">
      <div className="rpg-topbar">
        <div className="rpg-topbar-label">Repositorios</div>
        <button type="button" className="rpg-btn rpg-btn-ghost rpg-theme-toggle">
          <span>☾</span>
          <span>Modo oscuro</span>
        </button>
      </div>

      <div className="rpg-modal">
        <div className="rpg-modal-header">
          <div className="rpg-mh-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="18" r="3"></circle>
              <circle cx="6" cy="6" r="3"></circle>
              <path d="M6 21V9a9 9 0 0 0 9 9"></path>
            </svg>
          </div>
          <div className="rpg-mh-text">
            <div className="rpg-mh-title">Registrar proyecto Git</div>
            <div className="rpg-mh-sub">Crea el acceso con tu correo y contraseña.</div>
          </div>
          <div className="rpg-step-tag">Paso 1 de 2</div>
        </div>

        <div className="rpg-step-progress"><i></i></div>

        <div className="rpg-modal-body">
          <div className="rpg-row-gap">
            <div className="rpg-field">
              <label className="rpg-lbl" htmlFor="p-name">
                Nombre del proyecto <span className="rpg-req">*</span>
              </label>
              <input id="p-name" className="rpg-inp" placeholder="api-facturacion" readOnly />
            </div>

            <div className="rpg-field">
              <label className="rpg-lbl" htmlFor="p-mail">
                Correo electrónico <span className="rpg-req">*</span>
              </label>
              <div className="rpg-inp-icon">
                <span className="rpg-lead">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                    <path d="m3 7 9 6 9-6"></path>
                  </svg>
                </span>
                <input id="p-mail" className="rpg-inp" type="email" autoComplete="email" placeholder="nombre@empresa.com" readOnly />
              </div>
              <span className="rpg-hint-text">Será el usuario del proyecto y recibirá los avisos de sincronización.</span>
            </div>

            <div className="rpg-field">
              <div className="rpg-field-head">
                <label className="rpg-lbl" htmlFor="p-pass">
                  Contraseña <span className="rpg-req">*</span>
                </label>
                <button type="button" className="rpg-reveal-btn">Mostrar</button>
              </div>
              <div className="rpg-inp-icon">
                <span className="rpg-lead">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input id="p-pass" className="rpg-inp" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" readOnly />
              </div>
              <span className="rpg-hint-text">Usa 8 caracteres o más, con mayúscula y número.</span>
            </div>
          </div>
        </div>

        <div className="rpg-modal-footer">
          <div className="rpg-footer-hint">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="11" width="18" height="10" rx="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Tus credenciales se cifran en reposo.</span>
          </div>
          <div className="rpg-footer-actions">
            <button type="button" className="rpg-btn rpg-btn-ghost">Cancelar</button>
            <button type="button" className="rpg-btn rpg-btn-primary">Continuar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegistrarProyectoGit
