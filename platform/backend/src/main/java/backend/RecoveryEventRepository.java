
package backend;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RecoveryEventRepository
        extends JpaRepository<RecoveryEvent, Long> {
}
